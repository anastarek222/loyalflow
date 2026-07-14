import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type ReportsPageProps = {
  params: Promise<{
    slug: string;
  }>;

  searchParams: Promise<{
    from?: string;
    to?: string;
  }>;
};

function formatDateInput(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateInput(value: string, endOfDay = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const time = endOfDay ? "23:59:59.999" : "00:00:00.000";

  const date = new Date(`${value}T${time}Z`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

const dateTimeFormatter = new Intl.DateTimeFormat("ar-EG", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function ReportsPage({
  params,
  searchParams,
}: ReportsPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { slug } = await params;
  const query = await searchParams;

  const business = await prisma.business.findUnique({
    where: {
      slug,
    },
    select: {
      id: true,
      allowOwnerDataExport: true,
      name: true,
      slug: true,
      primaryColor: true,
      loyaltyMode: true,
      unitName: true,
      rewardName: true,
    },
  });

  if (!business) {
    notFound();
  }

  const canViewReports =
    session.user.role === "SUPER_ADMIN" ||
    (session.user.role === "OWNER" && session.user.businessId === business.id);

  if (!canViewReports) {
    redirect(`/businesses/${business.slug}`);
  }

  const today = new Date();

  const defaultToInput = formatDateInput(today);

  const defaultFromDate = new Date(today);
  defaultFromDate.setUTCDate(defaultFromDate.getUTCDate() - 29);

  const defaultFromInput = formatDateInput(defaultFromDate);

  let fromInput =
    query.from && parseDateInput(query.from) ? query.from : defaultFromInput;

  let toInput =
    query.to && parseDateInput(query.to, true) ? query.to : defaultToInput;

  let fromDate = parseDateInput(fromInput) ?? parseDateInput(defaultFromInput)!;

  let toDate =
    parseDateInput(toInput, true) ?? parseDateInput(defaultToInput, true)!;

  if (fromDate > toDate) {
    fromInput = defaultFromInput;
    toInput = defaultToInput;

    fromDate = parseDateInput(defaultFromInput)!;

    toDate = parseDateInput(defaultToInput, true)!;
  }

  const transactionWhere = {
    businessId: business.id,
    createdAt: {
      gte: fromDate,
      lte: toDate,
    },
  };

  const [
    newCustomers,
    earned,
    redeemed,
    transactionCount,
    activeCustomerGroups,
    currentBalances,
    recentTransactions,
    topCustomers,
  ] = await Promise.all([
    prisma.customer.count({
      where: {
        businessId: business.id,
        createdAt: {
          gte: fromDate,
          lte: toDate,
        },
      },
    }),

    prisma.loyaltyTransaction.aggregate({
      where: {
        ...transactionWhere,
        type: "EARN",
      },
      _sum: {
        amount: true,
      },
      _count: {
        _all: true,
      },
    }),

    prisma.rewardRedemption.aggregate({
      where: {
        businessId: business.id,
        createdAt: {
          gte: fromDate,
          lte: toDate,
        },
      },
      _sum: {
        cost: true,
      },
      _count: {
        _all: true,
      },
    }),

    prisma.loyaltyTransaction.count({
      where: transactionWhere,
    }),

    prisma.loyaltyTransaction.groupBy({
      by: ["customerId"],
      where: transactionWhere,
    }),

    prisma.customer.aggregate({
      where: {
        businessId: business.id,
        isActive: true,
      },
      _sum: {
        balance: true,
      },
    }),

    prisma.loyaltyTransaction.findMany({
      where: transactionWhere,
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            customerCode: true,
          },
        },
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    }),

    prisma.customer.findMany({
      where: {
        businessId: business.id,
      },
      orderBy: [
        {
          lifetimeEarned: "desc",
        },
        {
          createdAt: "asc",
        },
      ],
      take: 5,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        customerCode: true,
        balance: true,
        lifetimeEarned: true,
        lifetimeRedeemed: true,
      },
    }),
  ]);

  const earnedAmount = earned._sum.amount ?? 0;

  const redeemedCost = redeemed._sum.cost ?? 0;

  const currentBalance = currentBalances._sum.balance ?? 0;

  const canExportData =
    session.user.role === "SUPER_ADMIN" ||
    (session.user.role === "OWNER" &&
      session.user.businessId === business.id &&
      business.allowOwnerDataExport);

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-100 px-4 py-5 sm:px-8 sm:py-8"
    >
      <div className="mx-auto max-w-7xl">
        <Link
          href={`/businesses/${business.slug}`}
          className="text-sm font-medium text-violet-600 hover:text-violet-800"
        >
          → الرجوع إلى {business.name}
        </Link>

        <header
          className="mt-5 rounded-3xl p-5 text-white shadow-xl sm:p-8"
          style={{
            backgroundColor: business.primaryColor,
          }}
        >
          <p className="text-sm text-white/70">تقارير النشاط</p>

          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">
            {business.name}
          </h1>

          <p className="mt-2 text-sm text-white/70">
            متابعة العملاء وحركات الولاء والمكافآت.
          </p>
        </header>


        <section
          dir="rtl"
          className="mt-6 grid gap-3 sm:grid-cols-2"
        >
          <Link
            href={`/businesses/${business.slug}/reports/staff?from=${encodeURIComponent(fromInput)}&to=${encodeURIComponent(toInput)}`}
            className="rounded-2xl bg-violet-600 p-5 text-center font-black text-white shadow-sm transition hover:bg-violet-700"
          >
            👥 تقرير أداء الموظفين
          </Link>

          {canExportData && (
            <a
            href={`/businesses/${business.slug}/reports/export?from=${encodeURIComponent(fromInput)}&to=${encodeURIComponent(toInput)}`}
            className="rounded-2xl bg-emerald-600 p-5 text-center font-black text-white shadow-sm transition hover:bg-emerald-700"
          >
            📥 تصدير حركات الفترة CSV
          </a>
          )}
        </section>

        <form
          method="get"
          className="mt-6 grid gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:mt-8 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end sm:p-6"
        >
          <div>
            <label
              htmlFor="from"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              من تاريخ
            </label>

            <input
              id="from"
              name="from"
              type="date"
              defaultValue={fromInput}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <label
              htmlFor="to"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              إلى تاريخ
            </label>

            <input
              id="to"
              name="to"
              type="date"
              defaultValue={toInput}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950 outline-none focus:border-violet-500"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white transition hover:bg-violet-700 sm:w-auto"
          >
            تطبيق الفلتر
          </button>

          <Link
            href={`/businesses/${business.slug}/reports`}
            className="w-full rounded-xl border border-slate-300 bg-white px-6 py-3 text-center font-semibold text-slate-700 transition hover:border-violet-400 sm:w-auto"
          >
            آخر 30 يومًا
          </Link>
        </form>

        <section className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <article className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm text-slate-500">العملاء الجدد</p>

            <p className="mt-3 text-4xl font-bold text-slate-950">
              {newCustomers}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              تم تسجيلهم خلال الفترة المحددة
            </p>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm text-slate-500">العملاء النشطون</p>

            <p className="mt-3 text-4xl font-bold text-slate-950">
              {activeCustomerGroups.length}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              عملاء لديهم حركات ولاء
            </p>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm text-slate-500">الحركات</p>

            <p className="mt-3 text-4xl font-bold text-slate-950">
              {transactionCount}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              عمليات الإضافة والاستبدال
            </p>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm text-slate-500">رصيد الولاء المكتسب</p>

            <p className="mt-3 text-4xl font-bold text-emerald-600">
              {earnedAmount}
            </p>

            <p dir="auto" className="mt-2 text-xs text-slate-400">
              {earned._count._all} عملية إضافة — {business.unitName}
            </p>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm text-slate-500">المكافآت المستبدلة</p>

            <p className="mt-3 text-4xl font-bold text-amber-600">
              {redeemed._count._all}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              إجمالي التكلفة: {redeemedCost}
            </p>
          </article>

          <article className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <p className="text-sm text-slate-500">أرصدة العملاء الحالية</p>

            <p className="mt-3 text-4xl font-bold text-violet-600">
              {currentBalance}
            </p>

            <p dir="auto" className="mt-2 text-xs text-slate-400">
              إجمالي {business.unitName} المتاحة
            </p>
          </article>
        </section>

        <section className="mt-8 grid gap-8 xl:grid-cols-[1fr_360px]">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-5 sm:px-6">
              <h2 className="text-xl font-bold text-slate-950">أحدث الحركات</h2>

              <p className="mt-1 text-sm text-slate-500">
                أحدث 50 عملية خلال الفترة المحددة.
              </p>
            </div>

            {recentTransactions.length === 0 ? (
              <div className="p-10 text-center text-slate-500">
                لا توجد حركات خلال هذه الفترة.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-right text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-6 py-4">العميل</th>

                      <th className="px-6 py-4">النوع</th>

                      <th className="px-6 py-4">القيمة</th>

                      <th className="px-6 py-4">الرصيد</th>

                      <th className="px-6 py-4">الموظف</th>

                      <th className="px-6 py-4">التاريخ</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {recentTransactions.map((transaction) => {
                      const customerName = [
                        transaction.customer.firstName,
                        transaction.customer.lastName,
                      ]
                        .filter(Boolean)
                        .join(" ");

                      const employeeName = transaction.createdBy
                        ? [
                            transaction.createdBy.firstName,
                            transaction.createdBy.lastName,
                          ]
                            .filter(Boolean)
                            .join(" ")
                        : "النظام";

                      return (
                        <tr key={transaction.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4">
                            <Link
                              href={`/businesses/${business.slug}/customers/${transaction.customer.id}`}
                              className="font-semibold text-slate-950 hover:text-violet-700"
                            >
                              {customerName}
                            </Link>

                            <p className="mt-1 text-xs text-slate-400">
                              {transaction.customer.customerCode}
                            </p>
                          </td>

                          <td className="px-6 py-4">
                            <span
                              className={
                                transaction.type === "EARN"
                                  ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700"
                                  : transaction.type === "REDEEM"
                                    ? "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700"
                                    : "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                              }
                            >
                              {transaction.type === "EARN"
                                ? "إضافة رصيد"
                                : transaction.type === "REDEEM"
                                  ? "استبدال مكافأة"
                                  : "تعديل رصيد"}
                            </span>
                          </td>

                          <td
                            className={`px-6 py-4 font-bold ${
                              transaction.amount >= 0
                                ? "text-emerald-600"
                                : "text-amber-600"
                            }`}
                          >
                            {transaction.amount > 0 ? "+" : ""}
                            {transaction.amount}
                          </td>

                          <td className="px-6 py-4 font-semibold text-slate-700">
                            {transaction.balanceAfter}
                          </td>

                          <td className="px-6 py-4 text-slate-600">
                            {employeeName}
                          </td>

                          <td className="whitespace-nowrap px-6 py-4 text-slate-500">
                            {dateTimeFormatter.format(transaction.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">أفضل العملاء</h2>

            <p className="mt-1 text-sm text-slate-500">
              الترتيب حسب إجمالي رصيد الولاء المكتسب.
            </p>

            <div className="mt-6 space-y-4">
              {topCustomers.length === 0 ? (
                <p className="text-sm text-slate-500">
                  لا يوجد عملاء حتى الآن.
                </p>
              ) : (
                topCustomers.map((customer, index) => {
                  const customerName = [customer.firstName, customer.lastName]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <Link
                      key={customer.id}
                      href={`/businesses/${business.slug}/customers/${customer.id}`}
                      className="flex items-center gap-4 rounded-2xl border border-slate-200 p-4 transition hover:border-violet-300 hover:bg-violet-50"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 font-bold text-white">
                        {index + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-950">
                          {customerName}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {customer.customerCode}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="font-bold text-violet-700">
                          {customer.lifetimeEarned}
                        </p>

                        <p className="text-xs text-slate-400">
                          الرصيد {customer.balance}
                        </p>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
