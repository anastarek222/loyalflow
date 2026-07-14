import prisma from "@/lib/prisma";
import Link from "next/link";

type BusinessSalesKpisProps = {
  businessId: string;
  businessSlug: string;
  unitName: string;
  rewardThreshold: number;
  rewardName: string;
  primaryColor: string;
};

function getStartOfToday() {
  const now =
    new Date();

  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    )
  );
}

function getStartOfMonth() {
  const now =
    new Date();

  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      1
    )
  );
}

export default async function BusinessSalesKpis({
  businessId,
  businessSlug,
  unitName,
  rewardThreshold,
  rewardName,
  primaryColor,
}: BusinessSalesKpisProps) {
  const startOfToday =
    getStartOfToday();

  const startOfMonth =
    getStartOfMonth();

  const nearTargetMinimum =
    Math.max(
      1,
      Math.ceil(
        rewardThreshold * 0.8
      )
    );

  const [
    todaySales,
    monthSales,
    lifetimeSales,
    currentEligibleBalances,
    rewardReadyCount,
    nearTargetCount,
    topCustomers,
  ] =
    await Promise.all([
      prisma.loyaltyTransaction.aggregate({
        where: {
          businessId,
          type:
            "EARN",

          createdAt: {
            gte:
              startOfToday,
          },
        },

        _sum: {
          amount:
            true,
        },

        _count: {
          _all:
            true,
        },
      }),

      prisma.loyaltyTransaction.aggregate({
        where: {
          businessId,
          type:
            "EARN",

          createdAt: {
            gte:
              startOfMonth,
          },
        },

        _sum: {
          amount:
            true,
        },

        _count: {
          _all:
            true,
        },
      }),

      prisma.customer.aggregate({
        where: {
          businessId,
        },

        _sum: {
          lifetimeEarned:
            true,
        },
      }),

      prisma.customer.aggregate({
        where: {
          businessId,
          isActive:
            true,
        },

        _sum: {
          balance:
            true,
        },
      }),

      prisma.customer.count({
        where: {
          businessId,
          isActive:
            true,

          balance: {
            gte:
              rewardThreshold,
          },
        },
      }),

      prisma.customer.count({
        where: {
          businessId,
          isActive:
            true,

          balance: {
            gte:
              nearTargetMinimum,

            lt:
              rewardThreshold,
          },
        },
      }),

      prisma.customer.findMany({
        where: {
          businessId,
          isActive:
            true,
        },

        orderBy: [
          {
            balance:
              "desc",
          },
          {
            updatedAt:
              "desc",
          },
        ],

        take:
          3,

        select: {
          id:
            true,
          firstName:
            true,
          lastName:
            true,
          customerCode:
            true,
          balance:
            true,
        },
      }),
    ]);

  const numberFormatter =
    new Intl.NumberFormat(
      "ar-EG",
      {
        maximumFractionDigits:
          0,
      }
    );

  function formatAmount(
    amount:
      | number
      | null
      | undefined
  ) {
    return `${numberFormatter.format(
      amount ?? 0
    )} ${unitName}`;
  }

  const cards = [
    {
      title:
        "مبيعات اليوم",
      value:
        formatAmount(
          todaySales._sum.amount
        ),
      description:
        `${numberFormatter.format(
          todaySales._count._all
        )} عملية بيع`,
      className:
        "bg-emerald-50 text-emerald-950 ring-emerald-100",
    },
    {
      title:
        "مبيعات الشهر",
      value:
        formatAmount(
          monthSales._sum.amount
        ),
      description:
        `${numberFormatter.format(
          monthSales._count._all
        )} عملية بيع`,
      className:
        "bg-violet-50 text-violet-950 ring-violet-100",
    },
    {
      title:
        "إجمالي المبيعات",
      value:
        formatAmount(
          lifetimeSales
            ._sum
            .lifetimeEarned
        ),
      description:
        "منذ بداية البرنامج",
      className:
        "bg-cyan-50 text-cyan-950 ring-cyan-100",
    },
    {
      title:
        "أرصدة مؤهلة حالية",
      value:
        formatAmount(
          currentEligibleBalances
            ._sum
            .balance
        ),
      description:
        "متبقية قبل الاستبدال",
      className:
        "bg-slate-950 text-white ring-slate-900",
    },
    {
      title:
        "وصلوا إلى الجائزة",
      value:
        numberFormatter.format(
          rewardReadyCount
        ),
      description:
        rewardName,
      className:
        "bg-amber-50 text-amber-950 ring-amber-100",
    },
    {
      title:
        "قريبون من الهدف",
      value:
        numberFormatter.format(
          nearTargetCount
        ),
      description:
        "حققوا 80% أو أكثر",
      className:
        "bg-rose-50 text-rose-950 ring-rose-100",
    },
  ];

  return (
    <section
      dir="rtl"
      className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:mt-8 sm:p-7"
    >
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p
            className="text-sm font-black"
            style={{
              color:
                primaryColor,
            }}
          >
            برنامج إجمالي المبيعات
          </p>

          <h2 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">
            مؤشرات المبيعات والأهداف
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            متابعة قيم المبيعات، العملاء القريبين من الهدف
            والعملاء المستحقين للمكافأة.
          </p>
        </div>

        <Link
          href={`/businesses/${businessSlug}/reports`}
          className="rounded-xl bg-slate-950 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-violet-700"
        >
          فتح التقارير
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {cards.map(
          (card) => (
            <article
              key={card.title}
              className={`rounded-2xl p-4 shadow-sm ring-1 sm:p-5 ${card.className}`}
            >
              <p className="text-xs font-black opacity-65 sm:text-sm">
                {card.title}
              </p>

              <p
                dir="auto"
                className="mt-3 break-words text-xl font-black sm:text-3xl"
              >
                {card.value}
              </p>

              <p
                dir="auto"
                className="mt-2 truncate text-xs font-bold opacity-55"
              >
                {card.description}
              </p>
            </article>
          )
        )}
      </div>

      {topCustomers.length > 0 && (
        <div className="mt-7">
          <div className="flex items-center justify-between gap-4">
            <h3 className="font-black text-slate-950">
              أعلى العملاء تقدمًا
            </h3>

            <Link
              href={`/businesses/${businessSlug}/customers?sort=balance_high`}
              className="text-sm font-black text-violet-700 hover:text-violet-900"
            >
              كل العملاء
            </Link>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {topCustomers.map(
              (customer) => {
                const progress =
                  Math.min(
                    100,
                    Math.floor(
                      (
                        customer.balance /
                        Math.max(
                          1,
                          rewardThreshold
                        )
                      ) *
                        100
                    )
                  );

                const customerName =
                  [
                    customer.firstName,
                    customer.lastName,
                  ]
                    .filter(Boolean)
                    .join(" ");

                return (
                  <Link
                    key={customer.id}
                    href={`/businesses/${businessSlug}/customers/${customer.id}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-violet-300 hover:bg-white"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p
                          dir="auto"
                          className="truncate font-black text-slate-950"
                        >
                          {customerName}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {customer.customerCode}
                        </p>
                      </div>

                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-violet-700">
                        {numberFormatter.format(
                          progress
                        )}
                        %
                      </span>
                    </div>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width:
                            `${progress}%`,
                          backgroundColor:
                            primaryColor,
                        }}
                      />
                    </div>

                    <p
                      dir="auto"
                      className="mt-3 text-sm font-black text-slate-800"
                    >
                      {formatAmount(
                        customer.balance
                      )}
                    </p>

                    <p
                      dir="auto"
                      className="mt-1 text-xs text-slate-500"
                    >
                      الهدف:{" "}
                      {formatAmount(
                        rewardThreshold
                      )}
                    </p>
                  </Link>
                );
              }
            )}
          </div>
        </div>
      )}
    </section>
  );
}
