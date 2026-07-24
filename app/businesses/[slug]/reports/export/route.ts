import { auth } from "@/auth";
import {
  parseReportDateRange,
} from "@/lib/analytics/date-range";
import { resolveReportScope } from "@/lib/analytics/report-filters";
import {
  getCustomerFilterSegments,
  getCustomerSegmentWhere,
  type CustomerSegment,
} from "@/lib/customers/segments";
import { canExportBusinessData } from "@/lib/permissions";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExportRouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

function escapeCsvCell(
  value:
    | string
    | number
    | null
    | undefined
) {
  let text =
    value === null ||
    value === undefined
      ? ""
      : String(value);

  // منع Spreadsheet Formula Injection.
  if (
    /^[=+\-@]/.test(text)
  ) {
    text = `'${text}`;
  }

  return `"${text.replaceAll(
    '"',
    '""'
  )}"`;
}

const dateFormatter =
  new Intl.DateTimeFormat(
    "ar-EG-u-ca-gregory",
    {
      dateStyle:
        "medium",
      timeStyle:
        "short",
      timeZone:
        "UTC",
    }
  );

function getTransactionLabel(
  type: string
) {
  switch (type) {
    case "EARN":
      return "إضافة رصيد";

    case "REDEEM":
      return "استبدال مكافأة";

    case "ADJUSTMENT":
      return "تعديل يدوي";

    default:
      return type;
  }
}

export async function GET(
  request: Request,
  context: ExportRouteContext
) {
  const session =
    await auth();

  if (!session?.user) {
    return Response.json(
      {
        error:
          "يجب تسجيل الدخول",
      },
      {
        status:
          401,
      }
    );
  }

  const { slug } =
    await context.params;

  const business =
    await prisma.business.findUnique({
      where: {
        slug,
      },

      select: {
        id:
          true,
        allowOwnerDataExport: true,
        name:
          true,
        slug:
          true,
        unitName:
          true,
        loyaltyMode: true,
        rewardThreshold: true,
        earnAmount: true,
        isActive:
          true,
      },
    });

  if (
    !business ||
    !business.isActive
  ) {
    return Response.json(
      {
        error:
          "النشاط غير موجود",
      },
      {
        status:
          404,
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
        error:
          "غير مسموح",
      },
      {
        status:
          403,
      }
    );
  }

  const url =
    new URL(
      request.url
    );

  const dateRange = parseReportDateRange({
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
  });

  if (!dateRange) {
    return Response.json(
      {
        error:
          "فترة التاريخ غير صالحة",
      },
      {
        status:
          400,
      }
    );
  }

  const [branches, staff] = await Promise.all([
    prisma.branch.findMany({
      where: { businessId: business.id },
      select: { id: true, businessId: true, name: true, isActive: true },
    }),
    prisma.user.findMany({
      where: { businessId: business.id },
      select: { id: true, businessId: true },
    }),
  ]);
  const reportScope = resolveReportScope({
    businessId: business.id,
    branchId: url.searchParams.get("branch"),
    staffId: url.searchParams.get("staff"),
    branches,
    staff,
  });
  if (!reportScope) {
    return Response.json({ error: "فلتر الفرع أو الموظف غير صالح" }, { status: 400 });
  }

  const availableSegments = getCustomerFilterSegments(business.loyaltyMode);
  const requestedSegment = url.searchParams.get("segment");
  const segment = availableSegments.includes(requestedSegment as CustomerSegment)
    ? requestedSegment as CustomerSegment
    : null;
  const customerWhere = segment
    ? {
        businessId: business.id,
        ...getCustomerSegmentWhere(
          segment,
          business.rewardThreshold,
          undefined,
          business.earnAmount,
        ),
      }
    : undefined;

  const transactions =
    await prisma
      .loyaltyTransaction
      .findMany({
        where: {
          businessId:
            business.id,

          createdAt: {
            gte:
              dateRange.from,
            lte:
              dateRange.to,
          },
          ...reportScope,
          ...(customerWhere ? { customer: customerWhere } : {}),
        },

        orderBy: {
          createdAt:
            "desc",
        },

        select: {
          type:
            true,
          amount:
            true,
          balanceAfter:
            true,
          createdAt:
            true,

          customer: {
            select: {
              firstName:
                true,
              lastName:
                true,
              customerCode:
                true,
            },
          },

          createdBy: {
            select: {
              firstName:
                true,
              lastName:
                true,
              role:
                true,
            },
          },

          attributedStaff: {
            select: {
              firstName: true,
              lastName: true,
            },
          },

          branch: {
            select: {
              name: true,
            },
          },
        },
      });

  const headers = [
    "التاريخ",
    "نوع الحركة",
    "القيمة",
    "الوحدة",
    "الرصيد بعد الحركة",
    "كود العميل",
    "نفذها",
    "الدور",
    "الفرع",
    "الموظف المنسوب إليه",
  ];

  const rows =
    transactions.map(
      (transaction) => {
        const employeeName =
          transaction
            .createdBy
            ? [
                transaction
                  .createdBy
                  .firstName,

                transaction
                  .createdBy
                  .lastName,
              ]
                .filter(Boolean)
                .join(" ")
            : "النظام أو مستخدم محذوف";

        return [
          dateFormatter.format(
            transaction.createdAt
          ),

          getTransactionLabel(
            transaction.type
          ),

          transaction.amount,
          business.unitName,
          transaction.balanceAfter,
          transaction
            .customer
            .customerCode,

          employeeName,

          transaction
            .createdBy
            ?.role ?? "",

          transaction.branch?.name ?? "غير منسوب تاريخيًا",

          transaction.attributedStaff
            ? [
                transaction.attributedStaff.firstName,
                transaction.attributedStaff.lastName,
              ]
                .filter(Boolean)
                .join(" ")
            : "غير منسوب",

        ];
      }
    );

  const csvContent =
    "\uFEFF" +
    [
      headers,
      ...rows,
    ]
      .map(
        (row) =>
          row
            .map(
              escapeCsvCell
            )
            .join(",")
      )
      .join("\r\n");

  const filename =
    `${business.slug}-report-${dateRange.fromInput}-to-${dateRange.toInput}.csv`;

  return new Response(
    csvContent,
    {
      headers: {
        "Content-Type":
          "text/csv; charset=utf-8",

        "Content-Disposition":
          `attachment; filename="${filename}"`,

        "Cache-Control":
          "private, no-store, max-age=0",

        "X-Content-Type-Options":
          "nosniff",
      },
    }
  );
}
