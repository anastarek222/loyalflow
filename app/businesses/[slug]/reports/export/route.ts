import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExportRouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

function formatDateInput(
  date: Date
) {
  const year =
    date.getUTCFullYear();

  const month = String(
    date.getUTCMonth() + 1
  ).padStart(
    2,
    "0"
  );

  const day = String(
    date.getUTCDate()
  ).padStart(
    2,
    "0"
  );

  return `${year}-${month}-${day}`;
}

function parseDateInput(
  value: string | null,
  endOfDay = false
) {
  if (
    !value ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value
    )
  ) {
    return null;
  }

  const time =
    endOfDay
      ? "23:59:59.999"
      : "00:00:00.000";

  const date =
    new Date(
      `${value}T${time}Z`
    );

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
}

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
    session.user.role === "SUPER_ADMIN" ||
    (session.user.role === "OWNER" &&
      session.user.businessId === business.id &&
      business.allowOwnerDataExport);

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

  const today =
    new Date();

  const defaultTo =
    formatDateInput(
      today
    );

  const defaultFromDate =
    new Date(today);

  defaultFromDate.setUTCDate(
    defaultFromDate.getUTCDate() -
      29
  );

  const defaultFrom =
    formatDateInput(
      defaultFromDate
    );

  const fromInput =
    url.searchParams.get(
      "from"
    ) ?? defaultFrom;

  const toInput =
    url.searchParams.get(
      "to"
    ) ?? defaultTo;

  const from =
    parseDateInput(
      fromInput
    ) ??
    parseDateInput(
      defaultFrom
    );

  const to =
    parseDateInput(
      toInput,
      true
    ) ??
    parseDateInput(
      defaultTo,
      true
    );

  if (!from || !to) {
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

  if (
    from.getTime() >
    to.getTime()
  ) {
    return Response.json(
      {
        error:
          "تاريخ البداية بعد تاريخ النهاية",
      },
      {
        status:
          400,
      }
    );
  }

  const transactions =
    await prisma
      .loyaltyTransaction
      .findMany({
        where: {
          businessId:
            business.id,

          createdAt: {
            gte:
              from,
            lte:
              to,
          },
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
          note:
            true,
          createdAt:
            true,

          customer: {
            select: {
              firstName:
                true,
              lastName:
                true,
              phone:
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
              email:
                true,
              role:
                true,
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
    "اسم العميل",
    "كود العميل",
    "رقم الهاتف",
    "نفذها",
    "البريد",
    "الدور",
    "الملاحظة",
  ];

  const rows =
    transactions.map(
      (transaction) => {
        const customerName =
          [
            transaction
              .customer
              .firstName,

            transaction
              .customer
              .lastName,
          ]
            .filter(Boolean)
            .join(" ");

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
          customerName,

          transaction
            .customer
            .customerCode,

          transaction
            .customer
            .phone,

          employeeName,

          transaction
            .createdBy
            ?.email ?? "",

          transaction
            .createdBy
            ?.role ?? "",

          transaction.note ?? "",
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
    `${business.slug}-report-${fromInput}-to-${toInput}.csv`;

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
