import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

const ACTIVITIES_PER_PAGE = 25;

const activityTypes = [
  "CUSTOMER_CREATED",
  "CUSTOMER_UPDATED",
  "CUSTOMER_DEACTIVATED",
  "CUSTOMER_REACTIVATED",
  "LOYALTY_EARNED",
  "REWARD_REDEEMED",
  "BALANCE_ADJUSTED",
  "BUSINESS_SETTINGS_UPDATED",
  "USER_CREATED",
  "USER_STATUS_CHANGED",
  "USER_PASSWORD_CHANGED",
] as const;

type ActivityTypeValue =
  (typeof activityTypes)[number];

const activityLabels: Record<
  ActivityTypeValue,
  string
> = {
  CUSTOMER_CREATED: "إنشاء عميل",
  CUSTOMER_UPDATED: "تحديث بيانات عميل",
  CUSTOMER_DEACTIVATED: "إيقاف عميل",
  CUSTOMER_REACTIVATED: "إعادة تفعيل عميل",
  LOYALTY_EARNED: "إضافة رصيد ولاء",
  REWARD_REDEEMED: "استبدال مكافأة",
  BALANCE_ADJUSTED: "تعديل رصيد",
  BUSINESS_SETTINGS_UPDATED:
    "تحديث إعدادات النشاط",
  USER_CREATED: "إنشاء مستخدم",
  USER_STATUS_CHANGED: "تغيير حالة مستخدم",
  USER_PASSWORD_CHANGED: "تغيير كلمة المرور",
};

function localizeActivityDescription(
  value: string
) {
  return value
    .replace(
      /^Created customer /,
      "تم إنشاء العميل "
    )
    .replace(
      /^Updated customer information for /,
      "تم تحديث بيانات العميل "
    )
    .replace(
      /^Reactivated customer account$/,
      "تم إعادة تفعيل حساب العميل"
    )
    .replace(
      /^Deactivated customer account$/,
      "تم إيقاف حساب العميل"
    )
    .replace(
      /^Added (\d+) loyalty credit$/,
      "تمت إضافة $1 إلى رصيد الولاء"
    )
    .replace(
      /^Redeemed (.+) for (\d+)$/,
      "تم استبدال $1 مقابل $2"
    )
    .replace(
      /^Adjusted balance by ([+-]?\d+)\. Reason: (.+)$/,
      "تم تعديل الرصيد بمقدار $1. السبب: $2"
    )
    .replace(
      /^Updated business settings$/,
      "تم تحديث إعدادات النشاط"
    )
    .replace(
      /^Updated digital card contact details and terms$/,
      "تم تحديث بيانات التواصل وشروط الكارت"
    )
    .replace(
      /^Created owner account for (.+)$/,
      "تم إنشاء حساب مالك لـ $1"
    )
    .replace(
      /^Created staff account for (.+)$/,
      "تم إنشاء حساب موظف لـ $1"
    )
    .replace(
      /^Reactivated account (.+)$/,
      "تم إعادة تفعيل الحساب $1"
    )
    .replace(
      /^Deactivated account (.+)$/,
      "تم إيقاف الحساب $1"
    )
    .replace(
      /^Changed password for (.+)$/,
      "تم تغيير كلمة المرور للحساب $1"
    );
}

function getBadgeClass(type: ActivityTypeValue) {
  switch (type) {
    case "CUSTOMER_CREATED":
    case "CUSTOMER_REACTIVATED":
    case "LOYALTY_EARNED":
      return "bg-emerald-100 text-emerald-700";

    case "CUSTOMER_DEACTIVATED":
      return "bg-red-100 text-red-700";

    case "REWARD_REDEEMED":
    case "BALANCE_ADJUSTED":
      return "bg-amber-100 text-amber-700";

    case "BUSINESS_SETTINGS_UPDATED":
    case "USER_CREATED":
    case "USER_STATUS_CHANGED":
    case "USER_PASSWORD_CHANGED":
      return "bg-violet-100 text-violet-700";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

type ActivityPageProps = {
  params: Promise<{
    slug: string;
  }>;

  searchParams: Promise<{
    type?: string;
    page?: string;
  }>;
};

const dateFormatter = new Intl.DateTimeFormat(
  "ar-EG",
  {
    dateStyle: "medium",
    timeStyle: "short",
  }
);

export default async function ActivityPage({
  params,
  searchParams,
}: ActivityPageProps) {
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
      name: true,
      slug: true,
      primaryColor: true,
    },
  });

  if (!business) {
    notFound();
  }

  const canViewActivity =
    session.user.role === "SUPER_ADMIN" ||
    (session.user.role === "OWNER" &&
      session.user.businessId === business.id);

  if (!canViewActivity) {
    redirect(`/businesses/${business.slug}`);
  }

  const selectedType = activityTypes.includes(
    query.type as ActivityTypeValue
  )
    ? (query.type as ActivityTypeValue)
    : null;

  const parsedPage = Number.parseInt(
    query.page ?? "1",
    10
  );

  const requestedPage =
    Number.isFinite(parsedPage) && parsedPage > 0
      ? parsedPage
      : 1;

  const activityWhere = {
    businessId: business.id,
    ...(selectedType
      ? {
          type: selectedType,
        }
      : {}),
  };

  const totalActivities =
    await prisma.businessActivity.count({
      where: activityWhere,
    });

  const totalPages = Math.max(
    1,
    Math.ceil(
      totalActivities / ACTIVITIES_PER_PAGE
    )
  );

  const currentPage = Math.min(
    requestedPage,
    totalPages
  );

  const activities =
    await prisma.businessActivity.findMany({
      where: activityWhere,
      orderBy: {
        createdAt: "desc",
      },
      skip:
        (currentPage - 1) *
        ACTIVITIES_PER_PAGE,
      take: ACTIVITIES_PER_PAGE,
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
            email: true,
            role: true,
          },
        },
      },
    });

  function getPageUrl(pageNumber: number) {
    const parameters = new URLSearchParams();

    if (selectedType) {
      parameters.set("type", selectedType);
    }

    if (pageNumber > 1) {
      parameters.set(
        "page",
        String(pageNumber)
      );
    }

    const queryString = parameters.toString();

    return `/businesses/${slug}/activity${
      queryString ? `?${queryString}` : ""
    }`;
  }

  return (
    <main dir="rtl" className="min-h-screen bg-slate-100 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href={`/businesses/${business.slug}`}
          className="text-sm font-medium text-violet-600 hover:text-violet-800"
        >
          → الرجوع إلى {business.name}
        </Link>

        <header
          className="mt-5 rounded-3xl p-8 text-white shadow-xl"
          style={{
            backgroundColor: business.primaryColor,
          }}
        >
          <p className="text-sm text-white/70">
            سجل المراجعة
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            سجل النشاط
          </h1>

          <p className="mt-2 text-sm text-white/70">
            مراجعة العمليات التي نفذها المالك والموظفون والإدارة.
          </p>
        </header>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <form className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label
                htmlFor="type"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                نوع العملية
              </label>

              <select
                id="type"
                name="type"
                defaultValue={selectedType ?? ""}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-violet-500"
              >
                <option value="">
                  كل أنواع العمليات
                </option>

                {activityTypes.map((type) => (
                  <option key={type} value={type}>
                    {activityLabels[type]}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white transition hover:bg-violet-700"
            >
              تطبيق الفلتر
            </button>

            {selectedType && (
              <Link
                href={`/businesses/${business.slug}/activity`}
                className="rounded-xl border border-slate-300 px-6 py-3 text-center font-semibold text-slate-700"
              >
                Clear
              </Link>
            )}
          </form>
        </section>

        <div className="mt-6 flex items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            {totalActivities} عملية مسجلة
          </p>

          <p className="text-sm text-slate-500">
            صفحة {currentPage} من {totalPages}
          </p>
        </div>

        {activities.length === 0 ? (
          <section className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <h2 className="text-xl font-bold text-slate-950">
              لا توجد عمليات مسجلة
            </h2>

            <p className="mt-2 text-slate-500">
              ستظهر العمليات الجديدة هنا تلقائيًا.
            </p>
          </section>
        ) : (
          <section className="mt-6 space-y-4">
            {activities.map((activity) => {
              const type =
                activity.type as ActivityTypeValue;

              const employeeName =
                activity.createdBy
                  ? [
                      activity.createdBy.firstName,
                      activity.createdBy.lastName,
                    ]
                      .filter(Boolean)
                      .join(" ")
                  : "النظام أو مستخدم محذوف";

              const customerName =
                activity.customer
                  ? [
                      activity.customer.firstName,
                      activity.customer.lastName,
                    ]
                      .filter(Boolean)
                      .join(" ")
                  : null;

              return (
                <article
                  key={activity.id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row">
                    <div className="min-w-0">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getBadgeClass(
                          type
                        )}`}
                      >
                        {activityLabels[type]}
                      </span>

                      <p
                        dir="auto"
                        className="mt-3 font-semibold text-slate-950"
                      >
                        {localizeActivityDescription(activity.description)}
                      </p>

                      {activity.customer && (
                        <Link
                          href={`/businesses/${business.slug}/customers/${activity.customer.id}`}
                          className="mt-3 inline-flex text-sm font-semibold text-violet-600 hover:text-violet-800"
                        >
                          {customerName} —{" "}
                          {activity.customer.customerCode}
                        </Link>
                      )}
                    </div>

                    <div className="shrink-0 sm:text-right">
                      <p className="font-semibold text-slate-800">
                        {employeeName}
                      </p>

                      {activity.createdBy && (
                        <p className="mt-1 text-xs text-slate-400">
                          {activity.createdBy.role === "OWNER"
                            ? "مالك"
                            : activity.createdBy.role === "STAFF"
                              ? "موظف"
                              : "مدير النظام"}{" "}
                          ·{" "}
                          {activity.createdBy.email}
                        </p>
                      )}

                      <p className="mt-2 text-sm text-slate-500">
                        {dateFormatter.format(
                          activity.createdAt
                        )}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {totalPages > 1 && (
          <nav className="mt-7 flex items-center justify-center gap-3">
            {currentPage > 1 ? (
              <Link
                href={getPageUrl(currentPage - 1)}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700"
              >
                → السابق
              </Link>
            ) : (
              <span className="cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-5 py-3 font-semibold text-slate-400">
                → السابق
              </span>
            )}

            <span className="rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white">
              {currentPage} / {totalPages}
            </span>

            {currentPage < totalPages ? (
              <Link
                href={getPageUrl(currentPage + 1)}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700"
              >
                التالي ←
              </Link>
            ) : (
              <span className="cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-5 py-3 font-semibold text-slate-400">
                التالي ←
              </span>
            )}
          </nav>
        )}
      </div>
    </main>
  );
}
