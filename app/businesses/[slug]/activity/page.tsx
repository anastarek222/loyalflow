import { auth } from "@/auth";
import {
  ActivityType,
  Prisma,
} from "@/generated/prisma/client";
import {
  activityLabels,
  activityTypes,
  getActivityBadgeClass,
  getActivityMetadataString,
} from "@/lib/activity/presentation";
import { canPerform } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { getBusinessTheme } from "@/lib/theme";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

const ACTIVITIES_PER_PAGE = 25;

const legacyActivityTypes = [
  "CUSTOMER_CREATED",
  "CUSTOMER_UPDATED",
  "CUSTOMER_DEACTIVATED",
  "CUSTOMER_REACTIVATED",
  "CUSTOMER_TAG_ASSIGNED",
  "CUSTOMER_TAG_REMOVED",
  "CUSTOMER_NOTE_CREATED",
  "CUSTOMER_NOTE_UPDATED",
  "LOYALTY_EARNED",
  "REWARD_REDEEMED",
  "REWARD_UNLOCKED",
  "REWARD_EXPIRED",
  "REWARD_REDEMPTION_BLOCKED",
  "REFERRAL_RECORDED",
  "BALANCE_ADJUSTED",
  "BUSINESS_SETTINGS_UPDATED",
  "USER_CREATED",
  "USER_STATUS_CHANGED",
  "USER_PASSWORD_CHANGED",
  "REWARD_CREATED",
  "REWARD_UPDATED",
  "REWARD_STATUS_CHANGED",
  "OFFER_CREATED",
  "OFFER_UPDATED",
  "OFFER_STATUS_CHANGED",
  "BRANCH_CREATED",
  "BRANCH_UPDATED",
  "BRANCH_ACTIVATED",
  "BRANCH_DEACTIVATED",
  "BRANCH_STAFF_ASSIGNED",
  "BRANCH_STAFF_REMOVED",
] as const satisfies readonly ActivityType[];

const legacyActivityLabels: Record<
  ActivityType,
  string
> = {
  CUSTOMER_CREATED: "إنشاء عميل",
  CUSTOMER_UPDATED: "تحديث بيانات عميل",
  CUSTOMER_DEACTIVATED: "إيقاف عميل",
  CUSTOMER_REACTIVATED: "إعادة تفعيل عميل",
  CUSTOMER_TAG_ASSIGNED: "إضافة وسم للعميل",
  CUSTOMER_TAG_REMOVED: "إزالة وسم من العميل",
  CUSTOMER_NOTE_CREATED: "إضافة ملاحظة للعميل",
  CUSTOMER_NOTE_UPDATED: "تحديث ملاحظة العميل",
  LOYALTY_EARNED: "إضافة رصيد ولاء",
  REWARD_REDEEMED: "استبدال مكافأة",
  REWARD_UNLOCKED: "فتح مكافأة",
  REWARD_EXPIRED: "انتهاء صلاحية مكافأة",
  REWARD_REDEMPTION_BLOCKED: "تعذر استبدال مكافأة",
  REFERRAL_RECORDED: "تسجيل إحالة",
  BALANCE_ADJUSTED: "تعديل رصيد",
  BUSINESS_SETTINGS_UPDATED:
    "تحديث إعدادات النشاط",
  USER_CREATED: "إنشاء مستخدم",
  USER_STATUS_CHANGED: "تغيير حالة مستخدم",
  USER_PASSWORD_CHANGED: "تغيير كلمة المرور",
  REWARD_CREATED: "إنشاء مكافأة",
  REWARD_UPDATED: "تحديث مكافأة",
  REWARD_STATUS_CHANGED: "تغيير حالة مكافأة",
  OFFER_CREATED: "إنشاء عرض",
  OFFER_UPDATED: "تحديث عرض",
  OFFER_STATUS_CHANGED: "تغيير حالة عرض",
  BRANCH_CREATED: "إنشاء فرع",
  BRANCH_UPDATED: "تحديث فرع",
  BRANCH_ACTIVATED: "تفعيل فرع",
  BRANCH_DEACTIVATED: "إيقاف فرع",
  BRANCH_STAFF_ASSIGNED: "إسناد موظف إلى فرع",
  BRANCH_STAFF_REMOVED: "إزالة إسناد موظف من فرع",
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
    )
    .replace(
      /^Created reward (.+)$/,
      "تم إنشاء المكافأة $1"
    )
    .replace(
      /^Updated reward (.+)$/,
      "تم تحديث المكافأة $1"
    )
    .replace(
      /^Created offer (.+)$/,
      "تم إنشاء العرض $1"
    )
    .replace(
      /^Updated offer (.+)$/,
      "تم تحديث العرض $1"
    );
}

function legacyGetBadgeClass(type: ActivityType) {
  switch (type) {
    case "CUSTOMER_CREATED":
    case "CUSTOMER_REACTIVATED":
    case "CUSTOMER_TAG_ASSIGNED":
    case "CUSTOMER_NOTE_CREATED":
    case "LOYALTY_EARNED":
    case "REWARD_UNLOCKED":
    case "REFERRAL_RECORDED":
    case "BRANCH_CREATED":
    case "BRANCH_ACTIVATED":
    case "BRANCH_STAFF_ASSIGNED":
    case "REWARD_CREATED":
    case "OFFER_CREATED":
      return "bg-emerald-100 text-emerald-700";

    case "CUSTOMER_DEACTIVATED":
    case "CUSTOMER_TAG_REMOVED":
    case "REWARD_EXPIRED":
    case "REWARD_REDEMPTION_BLOCKED":
    case "BRANCH_DEACTIVATED":
      return "bg-red-100 text-red-700";

    case "CUSTOMER_UPDATED":
    case "CUSTOMER_NOTE_UPDATED":
    case "REWARD_REDEEMED":
    case "BALANCE_ADJUSTED":
    case "BRANCH_UPDATED":
    case "BRANCH_STAFF_REMOVED":
    case "REWARD_UPDATED":
    case "REWARD_STATUS_CHANGED":
    case "OFFER_UPDATED":
    case "OFFER_STATUS_CHANGED":
      return "bg-amber-100 text-amber-700";

    case "BUSINESS_SETTINGS_UPDATED":
    case "USER_CREATED":
    case "USER_STATUS_CHANGED":
    case "USER_PASSWORD_CHANGED":
      return "bg-violet-100 text-violet-700";

  }
}

const sortOptions = ["newest", "oldest"] as const;

type SortOption = (typeof sortOptions)[number];

const activityOrderBy: Record<
  SortOption,
  Prisma.BusinessActivityOrderByWithRelationInput
> = {
  newest: { createdAt: "desc" },
  oldest: { createdAt: "asc" },
};

function isActivityType(
  value: string | undefined
): value is ActivityType {
  return (
    typeof value === "string" &&
    Object.hasOwn(activityLabels, value)
  );
}

function isSortOption(
  value: string | undefined
): value is SortOption {
  return (
    typeof value === "string" &&
    Object.hasOwn(activityOrderBy, value)
  );
}

function getAllowedOption(
  value: string | undefined,
  options: ReadonlySet<string>
) {
  return value && options.has(value) ? value : null;
}

type ActivityPageProps = {
  params: Promise<{
    slug: string;
  }>;

  searchParams: Promise<{
    q?: string;
    type?: string;
    actor?: string;
    customer?: string;
    branch?: string;
    device?: string;
    sort?: string;
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
      secondaryColor: true,
      themePreset: true,
      cardStyle: true,
      fontFamily: true,
    },
  });

  if (!business) {
    notFound();
  }

  const theme =
    getBusinessTheme(business);

  const canViewActivity = canPerform(
    session.user,
    business.id,
    "REPORTS_VIEW"
  );

  if (!canViewActivity) {
    redirect(`/businesses/${business.slug}`);
  }

  const [actorOptions, customerOptions, branchOptions, deviceRows, totalActivities] =
    await Promise.all([
      prisma.user.findMany({
        where: { businessId: business.id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      }),
      prisma.customer.findMany({
        where: { businessId: business.id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          customerCode: true,
        },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      }),
      prisma.branch.findMany({
        where: { businessId: business.id },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.businessActivity.findMany({
        where: {
          businessId: business.id,
          deviceName: { not: null, notIn: [""] },
        },
        distinct: ["deviceName"],
        select: { deviceName: true },
        orderBy: { deviceName: "asc" },
      }),
      prisma.businessActivity.count({
        where: { businessId: business.id },
      }),
    ]);

  const deviceOptions = deviceRows
    .flatMap(({ deviceName }) =>
      deviceName ? [deviceName] : []
    )
    .sort((firstDevice, secondDevice) =>
      firstDevice.localeCompare(secondDevice)
    );
  const selectedType = isActivityType(query.type)
    ? query.type
    : null;
  const selectedActor = getAllowedOption(
    query.actor,
    new Set(actorOptions.map((actor) => actor.id))
  );
  const selectedCustomer = getAllowedOption(
    query.customer,
    new Set(customerOptions.map((customer) => customer.id))
  );
  const selectedBranch = getAllowedOption(
    query.branch,
    new Set(branchOptions.map((branch) => branch.id))
  );
  const selectedDevice = getAllowedOption(
    query.device,
    new Set(deviceOptions)
  );
  const selectedSort = isSortOption(query.sort)
    ? query.sort
    : "newest";
  const searchQuery = query.q?.trim().slice(0, 200) ?? "";

  const parsedPage =
    query.page && /^\d+$/.test(query.page)
      ? Number(query.page)
      : Number.NaN;

  const requestedPage =
    Number.isFinite(parsedPage) && parsedPage > 0
      ? parsedPage
      : 1;

  const activityWhere: Prisma.BusinessActivityWhereInput = {
    businessId: business.id,
    ...(selectedType
      ? {
          type: selectedType,
        }
      : {}),
    ...(selectedActor ? { createdById: selectedActor } : {}),
    ...(selectedCustomer
      ? { customerId: selectedCustomer }
      : {}),
    ...(selectedBranch ? { branchId: selectedBranch } : {}),
    ...(selectedDevice ? { deviceName: selectedDevice } : {}),
    ...(searchQuery
      ? {
          OR: [
            {
              description: {
                contains: searchQuery,
                mode: "insensitive",
              },
            },
            {
              deviceName: {
                contains: searchQuery,
                mode: "insensitive",
              },
            },
            {
              ipAddress: {
                contains: searchQuery,
                mode: "insensitive",
              },
            },
            {
              createdBy: {
                OR: [
                  {
                    firstName: {
                      contains: searchQuery,
                      mode: "insensitive",
                    },
                  },
                  {
                    lastName: {
                      contains: searchQuery,
                      mode: "insensitive",
                    },
                  },
                  {
                    email: {
                      contains: searchQuery,
                      mode: "insensitive",
                    },
                  },
                ],
              },
            },
            {
              customer: {
                OR: [
                  {
                    firstName: {
                      contains: searchQuery,
                      mode: "insensitive",
                    },
                  },
                  {
                    lastName: {
                      contains: searchQuery,
                      mode: "insensitive",
                    },
                  },
                  {
                    customerCode: {
                      contains: searchQuery,
                      mode: "insensitive",
                    },
                  },
                ],
              },
            },
            {
              branch: {
                name: {
                  contains: searchQuery,
                  mode: "insensitive",
                },
              },
            },
          ],
        }
      : {}),
  };

  const filteredActivities =
    await prisma.businessActivity.count({
      where: activityWhere,
    });

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredActivities / ACTIVITIES_PER_PAGE
    )
  );

  const currentPage = Math.min(
    requestedPage,
    totalPages
  );

  const activities =
    await prisma.businessActivity.findMany({
      where: activityWhere,
      orderBy: activityOrderBy[selectedSort],
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
        branch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

  function getPageUrl(pageNumber: number) {
    const parameters = new URLSearchParams();

    if (searchQuery) {
      parameters.set("q", searchQuery);
    }

    if (selectedType) {
      parameters.set("type", selectedType);
    }

    if (selectedActor) {
      parameters.set("actor", selectedActor);
    }

    if (selectedCustomer) {
      parameters.set("customer", selectedCustomer);
    }

    if (selectedBranch) {
      parameters.set("branch", selectedBranch);
    }

    if (selectedDevice) {
      parameters.set("device", selectedDevice);
    }

    if (selectedSort !== "newest") {
      parameters.set("sort", selectedSort);
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

  const hasActiveFilters = Boolean(
    searchQuery ||
      selectedType ||
      selectedActor ||
      selectedCustomer ||
      selectedBranch ||
      selectedDevice ||
      selectedSort !== "newest"
  );

  return (
    <main
      dir="rtl"
      className="min-h-screen px-4 py-8 sm:px-8"
      style={{
        backgroundColor: theme.backgroundColor,
        fontFamily: theme.fontFamily,
      }}
    >
      <div className="mx-auto max-w-6xl">
        <Link
          href={`/businesses/${business.slug}`}
          className="text-sm font-medium text-violet-600 hover:text-violet-800"
        >
          → الرجوع إلى {business.name}
        </Link>

        <header
          className={`mt-5 border p-8 text-white ${theme.cardClass} ${theme.borderClass}`}
          style={{
            backgroundColor: theme.primaryColor,
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

        <section
          className={`mt-8 border bg-white p-6 ${theme.cardClass} ${theme.borderClass}`}
        >
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="xl:col-span-2">
              <label
                htmlFor="q"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                البحث
              </label>

              <input
                id="q"
                name="q"
                type="search"
                maxLength={200}
                defaultValue={searchQuery}
                placeholder="الوصف، العميل، الموظف، الفرع، الجهاز أو IP"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none placeholder:text-slate-400 focus:border-violet-500"
              />
            </div>

            <div>
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

            <div>
              <label
                htmlFor="actor"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                المنفذ
              </label>

              <select
                id="actor"
                name="actor"
                defaultValue={selectedActor ?? ""}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-violet-500"
              >
                <option value="">كل المنفذين</option>

                {actorOptions.map((actor) => {
                  const actorName = [
                    actor.firstName,
                    actor.lastName,
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <option key={actor.id} value={actor.id}>
                      {actorName} — {actor.email}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label
                htmlFor="customer"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                العميل
              </label>

              <select
                id="customer"
                name="customer"
                defaultValue={selectedCustomer ?? ""}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-violet-500"
              >
                <option value="">كل العملاء</option>

                {customerOptions.map((customer) => {
                  const customerName = [
                    customer.firstName,
                    customer.lastName,
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <option
                      key={customer.id}
                      value={customer.id}
                    >
                      {customerName} — {customer.customerCode}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label
                htmlFor="branch"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                الفرع
              </label>

              <select
                id="branch"
                name="branch"
                defaultValue={selectedBranch ?? ""}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-violet-500"
              >
                <option value="">كل الفروع</option>

                {branchOptions.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="device"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                الجهاز
              </label>

              <select
                id="device"
                name="device"
                defaultValue={selectedDevice ?? ""}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-violet-500"
              >
                <option value="">كل الأجهزة</option>

                {deviceOptions.map((device) => (
                  <option key={device} value={device}>
                    {device}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="sort"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                الترتيب
              </label>

              <select
                id="sort"
                name="sort"
                defaultValue={selectedSort}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-violet-500"
              >
                <option value="newest">الأحدث أولًا</option>
                <option value="oldest">الأقدم أولًا</option>
              </select>
            </div>

            <div className="flex items-end gap-3 md:col-span-2 xl:col-span-2">
              <button
                type="submit"
                className="rounded-xl bg-violet-600 px-6 py-3 font-semibold text-white transition hover:bg-violet-700"
              >
                تطبيق الفلاتر
              </button>

              {hasActiveFilters && (
                <Link
                  href={`/businesses/${business.slug}/activity`}
                  className="rounded-xl border border-slate-300 px-6 py-3 text-center font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  مسح الفلاتر
                </Link>
              )}
            </div>
          </form>
        </section>

        <div className="mt-6 flex items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            {filteredActivities} نتيجة من أصل {totalActivities} عملية
          </p>

          <p className="text-sm text-slate-500">
            صفحة {currentPage} من {totalPages}
          </p>
        </div>

        {totalActivities === 0 ? (
          <section className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <h2 className="text-xl font-bold text-slate-950">
              لا توجد عمليات مسجلة
            </h2>

            <p className="mt-2 text-slate-500">
              ستظهر العمليات الجديدة هنا تلقائيًا.
            </p>
          </section>
        ) : activities.length === 0 ? (
          <section className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <h2 className="text-xl font-bold text-slate-950">
              لا توجد عمليات تطابق البحث أو الفلاتر المحددة
            </h2>

            <p className="mt-2 text-slate-500">
              جرّب تعديل معايير البحث أو إزالة الفلاتر للعثور على
              عمليات أخرى.
            </p>

            <Link
              href={`/businesses/${business.slug}/activity`}
              className="mt-5 inline-flex rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              مسح الفلاتر
            </Link>
          </section>
        ) : (
          <section className="mt-6 space-y-4">
            {activities.map((activity) => {
              const metadataActorEmail = getActivityMetadataString(
                activity.metadata,
                "actorEmail",
              );
              const employeeName =
                activity.createdBy
                  ? [
                      activity.createdBy.firstName,
                      activity.createdBy.lastName,
                    ]
                      .filter(Boolean)
                      .join(" ")
                  : metadataActorEmail
                    ? `مدير النظام (${metadataActorEmail})`
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
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getActivityBadgeClass(
                          activity.type
                        )}`}
                      >
                        {activityLabels[activity.type]}
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
                            : activity.createdBy.role === "MANAGER"
                              ? "مدير"
                              : activity.createdBy.role === "STAFF"
                                ? "موظف"
                                : activity.createdBy.role === "VIEWER"
                                  ? "مشاهد"
                                  : "مدير النظام"}{" "}
                          ·{" "}
                          {activity.createdBy.email}
                        </p>
                      )}

                      {!activity.createdBy && metadataActorEmail && (
                        <p className="mt-1 text-xs text-slate-400">
                          مدير النظام · {metadataActorEmail}
                        </p>
                      )}

                      <div className="mt-3 space-y-1 text-xs text-slate-500">
                        {activity.branch && (
                          <p>
                            <span className="font-semibold text-slate-600">
                              الفرع:
                            </span>{" "}
                            {activity.branch.name}
                          </p>
                        )}

                        {activity.deviceName && (
                          <p>
                            <span className="font-semibold text-slate-600">
                              الجهاز:
                            </span>{" "}
                            {activity.deviceName}
                          </p>
                        )}

                        {activity.ipAddress && (
                          <p dir="ltr" className="sm:text-right">
                            <span className="font-semibold text-slate-600">
                              IP:
                            </span>{" "}
                            {activity.ipAddress}
                          </p>
                        )}

                        <p>
                          <span className="font-semibold text-slate-600">
                            الوقت:
                          </span>{" "}
                          {dateFormatter.format(
                            activity.createdAt
                          )}
                        </p>
                      </div>
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
