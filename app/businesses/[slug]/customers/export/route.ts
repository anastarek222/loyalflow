import { auth } from "@/auth";
import { parseSelectedExportIds } from "@/lib/customers/bulk";
import {
  customerMatchesSegment,
  getCustomerFilterSegments,
  type CustomerSegment,
} from "@/lib/customers/segments";
import { canExportBusinessData } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { resolveBusinessCustomerAudienceContexts } from "@/lib/server/customers/audience-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExportRouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

function escapeCsvCell(
  value: string | number | null | undefined
) {
  let text = value === null || value === undefined
    ? ""
    : String(value);

  // Prevent spreadsheet formula injection.
  if (/^[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(
  request: Request,
  context: ExportRouteContext
) {
  const session = await auth();

  if (!session?.user) {
    return Response.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  const { slug } = await context.params;

  const business = await prisma.business.findUnique({
    where: {
      slug,
    },
    select: {
      id: true,
      allowOwnerDataExport: true,
      name: true,
      slug: true,
      isActive: true,
      loyaltyMode: true,
      rewardName: true,
      rewardThreshold: true,
    },
  });

  if (!business || !business.isActive) {
    return Response.json(
      {
        error: "Business not found",
      },
      {
        status: 404,
      }
    );
  }

  const canExportData =
    canExportBusinessData(
      session.user,
      business.id,
      business.allowOwnerDataExport
    );

  if (!canExportData) {
    return Response.json(
      {
        error: "Forbidden",
      },
      {
        status: 403,
      }
    );
  }

  const url = new URL(request.url);
  const selectedIds = parseSelectedExportIds(url.searchParams.get("ids"));
  const requestedSelection = url.searchParams.has("ids");
  if (requestedSelection && !selectedIds) {
    return Response.json({ error: "Invalid selected customers" }, { status: 400 });
  }

  const availableSegments = getCustomerFilterSegments(business.loyaltyMode);
  const requestedSegment = url.searchParams.get("segment");
  const segment = availableSegments.includes(requestedSegment as CustomerSegment)
    ? (requestedSegment as CustomerSegment)
    : null;
  if (requestedSegment && !segment) {
    return Response.json({ error: "Invalid customer segment" }, { status: 400 });
  }

  if (selectedIds) {
    const selectedCount = await prisma.customer.count({
      where: { businessId: business.id, id: { in: selectedIds } },
    });
    if (selectedCount !== selectedIds.length) {
      return Response.json({ error: "Selected customers not found" }, { status: 400 });
    }
  }

  const [customers, activeRewards] = await Promise.all([
    prisma.customer.findMany({
      where: {
        businessId: business.id,
        ...(selectedIds ? { id: { in: selectedIds } } : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        customerCode: true,
        balance: true,
        lifetimeEarned: true,
        lifetimeRedeemed: true,
        isActive: true,
        createdAt: true,
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
        _count: {
          select: {
            redemptions: true,
            transactions: true,
          },
        },
      },
    }),
    segment
      ? prisma.reward.findMany({
          where: { businessId: business.id, isActive: true },
          select: { id: true, name: true, cost: true, isActive: true },
        })
      : Promise.resolve([]),
  ]);

  const audienceContexts = segment
    ? await resolveBusinessCustomerAudienceContexts({
        business,
        customers,
        catalogueRewards: activeRewards,
      })
    : new Map();

  const exportedCustomers = segment
    ? customers.filter((customer) =>
        customerMatchesSegment(
          segment,
          {
            isActive: customer.isActive,
            createdAt: customer.createdAt,
            lastActivityAt: customer.transactions[0]?.createdAt ?? null,
            lifetimeEarned: customer.lifetimeEarned,
            rewardThreshold: business.rewardThreshold,
          },
          audienceContexts.get(customer.id) ?? {},
        ),
      )
    : customers;

  const headers = [
    "الاسم الأول",
    "اسم العائلة",
    "رقم الهاتف",
    "كود العميل",
    "الرصيد الحالي",
    "إجمالي المكتسب",
    "إجمالي المستبدل",
    "عدد المكافآت المستبدلة",
    "عدد الحركات",
    "الحالة",
    "تاريخ التسجيل",
  ];

  const rows = exportedCustomers.map((customer) => [
    customer.firstName,
    customer.lastName ?? "",
    customer.phone,
    customer.customerCode,
    customer.balance,
    customer.lifetimeEarned,
    customer.lifetimeRedeemed,
    customer._count.redemptions,
    customer._count.transactions,
    customer.isActive ? "نشط" : "موقوف",
    customer.createdAt.toISOString(),
  ]);

  const csvContent =
    "\uFEFF" +
    [headers, ...rows]
      .map((row) =>
        row.map((cell) => escapeCsvCell(cell)).join(",")
      )
      .join("\r\n");

  const filename =
    `${business.slug}-customers-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

  return new Response(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
