import { auth } from "@/auth";
import { canExportBusinessData } from "@/lib/permissions";
import { parseSelectedExportIds } from "@/lib/customers/bulk";
import prisma from "@/lib/prisma";

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

  const selectedIds = parseSelectedExportIds(
    new URL(request.url).searchParams.get("ids")
  );
  const requestedSelection = new URL(request.url).searchParams.has("ids");
  if (requestedSelection && !selectedIds) {
    return Response.json({ error: "Invalid selected customers" }, { status: 400 });
  }

  if (selectedIds) {
    const selectedCount = await prisma.customer.count({
      where: { businessId: business.id, id: { in: selectedIds } },
    });
    if (selectedCount !== selectedIds.length) {
      return Response.json({ error: "Selected customers not found" }, { status: 400 });
    }
  }

  const customers = await prisma.customer.findMany({
    where: {
      businessId: business.id,
      ...(selectedIds ? { id: { in: selectedIds } } : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      firstName: true,
      lastName: true,
      phone: true,
      customerCode: true,
      balance: true,
      lifetimeEarned: true,
      lifetimeRedeemed: true,
      isActive: true,
      createdAt: true,
      _count: {
        select: {
          redemptions: true,
          transactions: true,
        },
      },
    },
  });

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

  const rows = customers.map((customer) => [
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
