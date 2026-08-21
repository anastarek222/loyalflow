import { auth } from "@/auth";
import { ActivityType, Prisma } from "@/generated/prisma/client";
import {
  activityLabels,
  activityTypes,
  getActivityBadgeClass,
  getActivityDescription,
  getActivityLabel,
  getActivityMetadataString,
} from "@/lib/activity/presentation";
import { getLanguageLocale, normalizeLanguage, type AppLanguage } from "@/lib/i18n";
import { canPerform } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

const ACTIVITIES_PER_PAGE = 25;
type SortOption = "newest" | "oldest";

const activityOrderBy: Record<SortOption, Prisma.BusinessActivityOrderByWithRelationInput> = {
  newest: { createdAt: "desc" },
  oldest: { createdAt: "asc" },
};

function t(language: AppLanguage, ar: string, en: string) {
  return language === "AR" ? ar : en;
}

function localizeActivityDescription(value: string, language: AppLanguage) {
  if (language === "EN") return value;
  return value
    .replace(/^Created customer /, "تم إنشاء العميل ")
    .replace(/^Updated customer information for /, "تم تحديث بيانات العميل ")
    .replace(/^Reactivated customer account$/, "تم إعادة تفعيل حساب العميل")
    .replace(/^Deactivated customer account$/, "تم إيقاف حساب العميل")
    .replace(/^Added (\d+) loyalty credit$/, "تمت إضافة $1 إلى رصيد الولاء")
    .replace(/^Redeemed (.+) for (\d+)$/, "تم استبدال $1 مقابل $2")
    .replace(/^Adjusted balance by ([+-]?\d+)\. Reason: (.+)$/, "تم تعديل الرصيد بمقدار $1. السبب: $2")
    .replace(/^Updated business settings$/, "تم تحديث إعدادات النشاط")
    .replace(/^Updated digital card contact details and terms$/, "تم تحديث بيانات التواصل وشروط الكارت")
    .replace(/^Created owner account for (.+)$/, "تم إنشاء حساب مالك لـ $1")
    .replace(/^Created staff account for (.+)$/, "تم إنشاء حساب موظف لـ $1")
    .replace(/^Reactivated account (.+)$/, "تم إعادة تفعيل الحساب $1")
    .replace(/^Deactivated account (.+)$/, "تم إيقاف الحساب $1")
    .replace(/^Changed password for (.+)$/, "تم تغيير كلمة المرور للحساب $1")
    .replace(/^Created reward (.+)$/, "تم إنشاء المكافأة $1")
    .replace(/^Updated reward (.+)$/, "تم تحديث المكافأة $1")
    .replace(/^Created offer (.+)$/, "تم إنشاء العرض $1")
    .replace(/^Updated offer (.+)$/, "تم تحديث العرض $1");
}

function isActivityType(value: string | undefined): value is ActivityType {
  return typeof value === "string" && Object.hasOwn(activityLabels, value);
}

function isSortOption(value: string | undefined): value is SortOption {
  return typeof value === "string" && Object.hasOwn(activityOrderBy, value);
}

function getAllowedOption(value: string | undefined, options: ReadonlySet<string>) {
  return value && options.has(value) ? value : null;
}

type ActivityPageProps = {
  params: Promise<{ slug: string }>;
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

export default async function ActivityPage({ params, searchParams }: ActivityPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { slug } = await params;
  const query = await searchParams;
  const [user, business] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { language: true } }),
    prisma.business.findUnique({
      where: { slug },
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
    }),
  ]);

  if (!business) notFound();
  if (!canPerform(session.user, business.id, "REPORTS_VIEW")) redirect(`/businesses/${business.slug}`);

  const language = normalizeLanguage(user?.language);
  const dateFormatter = new Intl.DateTimeFormat(getLanguageLocale(language), {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const [actorOptions, customerOptions, branchOptions, deviceRows, totalActivities] = await Promise.all([
    prisma.user.findMany({
      where: { businessId: business.id },
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    prisma.customer.findMany({
      where: { businessId: business.id },
      select: { id: true, firstName: true, lastName: true, customerCode: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    prisma.branch.findMany({
      where: { businessId: business.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.businessActivity.findMany({
      where: { businessId: business.id, deviceName: { not: null, notIn: [""] } },
      distinct: ["deviceName"],
      select: { deviceName: true },
      orderBy: { deviceName: "asc" },
    }),
    prisma.businessActivity.count({ where: { businessId: business.id } }),
  ]);

  const deviceOptions = deviceRows
    .flatMap(({ deviceName }) => (deviceName ? [deviceName] : []))
    .sort((a, b) => a.localeCompare(b));
  const selectedType = isActivityType(query.type) ? query.type : null;
  const selectedActor = getAllowedOption(query.actor, new Set(actorOptions.map((actor) => actor.id)));
  const selectedCustomer = getAllowedOption(query.customer, new Set(customerOptions.map((customer) => customer.id)));
  const selectedBranch = getAllowedOption(query.branch, new Set(branchOptions.map((branch) => branch.id)));
  const selectedDevice = getAllowedOption(query.device, new Set(deviceOptions));
  const selectedSort = isSortOption(query.sort) ? query.sort : "newest";
  const searchQuery = query.q?.trim().slice(0, 200) ?? "";
  const parsedPage = query.page && /^\d+$/.test(query.page) ? Number(query.page) : Number.NaN;
  const requestedPage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const activityWhere: Prisma.BusinessActivityWhereInput = {
    businessId: business.id,
    ...(selectedType ? { type: selectedType } : {}),
    ...(selectedActor ? { createdById: selectedActor } : {}),
    ...(selectedCustomer ? { customerId: selectedCustomer } : {}),
    ...(selectedBranch ? { branchId: selectedBranch } : {}),
    ...(selectedDevice ? { deviceName: selectedDevice } : {}),
    ...(searchQuery
      ? {
          OR: [
            { description: { contains: searchQuery, mode: "insensitive" } },
            { deviceName: { contains: searchQuery, mode: "insensitive" } },
            { ipAddress: { contains: searchQuery, mode: "insensitive" } },
            {
              createdBy: {
                OR: [
                  { firstName: { contains: searchQuery, mode: "insensitive" } },
                  { lastName: { contains: searchQuery, mode: "insensitive" } },
                  { email: { contains: searchQuery, mode: "insensitive" } },
                ],
              },
            },
            {
              customer: {
                OR: [
                  { firstName: { contains: searchQuery, mode: "insensitive" } },
                  { lastName: { contains: searchQuery, mode: "insensitive" } },
                  { customerCode: { contains: searchQuery, mode: "insensitive" } },
                ],
              },
            },
            { branch: { name: { contains: searchQuery, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const filteredActivities = await prisma.businessActivity.count({ where: activityWhere });
  const totalPages = Math.max(1, Math.ceil(filteredActivities / ACTIVITIES_PER_PAGE));
  const currentPage = Math.min(requestedPage, totalPages);
  const activities = await prisma.businessActivity.findMany({
    where: activityWhere,
    orderBy: activityOrderBy[selectedSort],
    skip: (currentPage - 1) * ACTIVITIES_PER_PAGE,
    take: ACTIVITIES_PER_PAGE,
    include: {
      customer: { select: { id: true, firstName: true, lastName: true, customerCode: true } },
      createdBy: { select: { firstName: true, lastName: true, email: true, role: true } },
      branch: { select: { id: true, name: true } },
    },
  });

  function getPageUrl(pageNumber: number) {
    const parameters = new URLSearchParams();
    if (searchQuery) parameters.set("q", searchQuery);
    if (selectedType) parameters.set("type", selectedType);
    if (selectedActor) parameters.set("actor", selectedActor);
    if (selectedCustomer) parameters.set("customer", selectedCustomer);
    if (selectedBranch) parameters.set("branch", selectedBranch);
    if (selectedDevice) parameters.set("device", selectedDevice);
    if (selectedSort !== "newest") parameters.set("sort", selectedSort);
    if (pageNumber > 1) parameters.set("page", String(pageNumber));
    const queryString = parameters.toString();
    return `/businesses/${slug}/activity${queryString ? `?${queryString}` : ""}`;
  }

  const hasActiveFilters = Boolean(
    searchQuery || selectedType || selectedActor || selectedCustomer || selectedBranch || selectedDevice || selectedSort !== "newest",
  );
  const roleLabel = (role: string) =>
    role === "OWNER"
      ? t(language, "مالك", "Owner")
      : role === "MANAGER"
        ? t(language, "مدير", "Manager")
        : role === "STAFF"
          ? t(language, "موظف", "Staff")
          : role === "VIEWER"
            ? t(language, "مشاهد", "Viewer")
            : t(language, "مدير النظام", "System administrator");

  return (
    <main className="min-h-screen px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href={`/businesses/${business.slug}`} className="text-sm font-medium text-primary hover:text-primary">
          {t(language, `→ الرجوع إلى ${business.name}`, `← Back to ${business.name}`)}
        </Link>

        <header className="mt-6">
          <p className="text-sm font-bold text-primary">{t(language, "سجل المراجعة", "Audit log")}</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">{t(language, "سجل النشاط", "Activity log")}</h1>
          <p className="mt-2 text-sm text-foreground-muted">
            {t(language, "مراجعة العمليات التي نفذها المالك والموظفون والإدارة.", "Review operations performed by owners, staff, and administrators.")}
          </p>
        </header>

        <section className="mt-8 rounded-[var(--lf-radius-card)] border border-border bg-white p-6">
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="xl:col-span-2">
              <label htmlFor="q" className="mb-2 block text-sm font-medium text-foreground-muted">{t(language, "البحث", "Search")}</label>
              <input id="q" name="q" type="search" maxLength={200} defaultValue={searchQuery}
                placeholder={t(language, "الوصف، العميل، الموظف، الفرع، الجهاز أو IP", "Description, customer, employee, branch, device, or IP")}
                className="w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4 outline-none placeholder:text-foreground-subtle focus:border-primary/30" />
            </div>
            <div>
              <label htmlFor="type" className="mb-2 block text-sm font-medium text-foreground-muted">{t(language, "نوع العملية", "Activity type")}</label>
              <select id="type" name="type" defaultValue={selectedType ?? ""} className="w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4 outline-none focus:border-primary/30">
                <option value="">{t(language, "كل أنواع العمليات", "All activity types")}</option>
                {activityTypes.map((type) => <option key={type} value={type}>{getActivityLabel(type, language)}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="actor" className="mb-2 block text-sm font-medium text-foreground-muted">{t(language, "المنفذ", "Actor")}</label>
              <select id="actor" name="actor" defaultValue={selectedActor ?? ""} className="w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4 outline-none focus:border-primary/30">
                <option value="">{t(language, "كل المنفذين", "All actors")}</option>
                {actorOptions.map((actor) => {
                  const actorName = [actor.firstName, actor.lastName].filter(Boolean).join(" ");
                  return <option key={actor.id} value={actor.id}>{actorName} — {actor.email}</option>;
                })}
              </select>
            </div>
            <div>
              <label htmlFor="customer" className="mb-2 block text-sm font-medium text-foreground-muted">{t(language, "العميل", "Customer")}</label>
              <select id="customer" name="customer" defaultValue={selectedCustomer ?? ""} className="w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4 outline-none focus:border-primary/30">
                <option value="">{t(language, "كل العملاء", "All customers")}</option>
                {customerOptions.map((customer) => {
                  const customerName = [customer.firstName, customer.lastName].filter(Boolean).join(" ");
                  return <option key={customer.id} value={customer.id}>{customerName} — {customer.customerCode}</option>;
                })}
              </select>
            </div>
            <div>
              <label htmlFor="branch" className="mb-2 block text-sm font-medium text-foreground-muted">{t(language, "الفرع", "Branch")}</label>
              <select id="branch" name="branch" defaultValue={selectedBranch ?? ""} className="w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4 outline-none focus:border-primary/30">
                <option value="">{t(language, "كل الفروع", "All branches")}</option>
                {branchOptions.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="device" className="mb-2 block text-sm font-medium text-foreground-muted">{t(language, "الجهاز", "Device")}</label>
              <select id="device" name="device" defaultValue={selectedDevice ?? ""} className="w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4 outline-none focus:border-primary/30">
                <option value="">{t(language, "كل الأجهزة", "All devices")}</option>
                {deviceOptions.map((device) => <option key={device} value={device}>{device}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="sort" className="mb-2 block text-sm font-medium text-foreground-muted">{t(language, "الترتيب", "Sort")}</label>
              <select id="sort" name="sort" defaultValue={selectedSort} className="w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4 outline-none focus:border-primary/30">
                <option value="newest">{t(language, "الأحدث أولًا", "Newest first")}</option>
                <option value="oldest">{t(language, "الأقدم أولًا", "Oldest first")}</option>
              </select>
            </div>
            <div className="flex items-end gap-4 md:col-span-2 xl:col-span-2">
              <button type="submit" className="rounded-[var(--lf-radius-input)] bg-primary px-6 py-4 font-semibold text-[var(--lf-primary-foreground)] transition hover:bg-primary-subtle">
                {t(language, "تطبيق الفلاتر", "Apply filters")}
              </button>
              {hasActiveFilters && (
                <Link href={`/businesses/${business.slug}/activity`} className="rounded-[var(--lf-radius-input)] border border-border px-6 py-4 text-center font-semibold text-foreground-muted transition hover:bg-surface-subtle">
                  {t(language, "مسح الفلاتر", "Clear filters")}
                </Link>
              )}
            </div>
          </form>
        </section>

        <div className="mt-6 flex items-center justify-between gap-4">
          <p className="text-sm text-foreground-subtle">{t(language, `${filteredActivities} نتيجة من أصل ${totalActivities} عملية`, `${filteredActivities} of ${totalActivities} activities`)}</p>
          <p className="text-sm text-foreground-subtle">{t(language, `صفحة ${currentPage} من ${totalPages}`, `Page ${currentPage} of ${totalPages}`)}</p>
        </div>

        {totalActivities === 0 ? (
          <section className="mt-6 rounded-[var(--lf-radius-card)] border border-dashed border-border bg-white p-12 text-center">
            <h2 className="text-xl font-bold text-foreground">{t(language, "لا توجد عمليات مسجلة", "No activities recorded")}</h2>
            <p className="mt-2 text-foreground-subtle">{t(language, "ستظهر العمليات الجديدة هنا تلقائيًا.", "New activities will appear here automatically.")}</p>
          </section>
        ) : activities.length === 0 ? (
          <section className="mt-6 rounded-[var(--lf-radius-card)] border border-dashed border-border bg-white p-12 text-center">
            <h2 className="text-xl font-bold text-foreground">{t(language, "لا توجد عمليات تطابق البحث أو الفلاتر المحددة", "No activities match the selected search or filters")}</h2>
            <p className="mt-2 text-foreground-subtle">{t(language, "جرّب تعديل معايير البحث أو إزالة الفلاتر للعثور على عمليات أخرى.", "Adjust the search criteria or clear filters to find other activities.")}</p>
            <Link href={`/businesses/${business.slug}/activity`} className="mt-6 inline-flex rounded-[var(--lf-radius-input)] border border-border px-6 py-4 font-semibold text-foreground-muted transition hover:bg-surface-subtle">
              {t(language, "مسح الفلاتر", "Clear filters")}
            </Link>
          </section>
        ) : (
          <section className="mt-6 space-y-4">
            {activities.map((activity) => {
              const metadataActorEmail = getActivityMetadataString(activity.metadata, "actorEmail");
              const employeeName = activity.createdBy
                ? [activity.createdBy.firstName, activity.createdBy.lastName].filter(Boolean).join(" ")
                : metadataActorEmail
                  ? t(language, `مدير النظام (${metadataActorEmail})`, `System administrator (${metadataActorEmail})`)
                  : t(language, "النظام أو مستخدم محذوف", "System or deleted user");
              const customerName = activity.customer
                ? [activity.customer.firstName, activity.customer.lastName].filter(Boolean).join(" ")
                : null;
              const renderedDescription = getActivityDescription(activity, language);
              return (
                <article key={activity.id} className="rounded-[var(--lf-radius-card)] border border-border bg-white p-6 shadow-sm">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row">
                    <div className="min-w-0">
                      <span className={`inline-flex rounded-full px-4 py-1 text-xs font-semibold ${getActivityBadgeClass(activity.type)}`}>
                        {getActivityLabel(activity.type, language)}
                      </span>
                      <p dir="auto" className="mt-4 font-semibold text-foreground">{localizeActivityDescription(renderedDescription, language)}</p>
                      {activity.customer && (
                        <Link href={`/businesses/${business.slug}/customers/${activity.customer.id}`} className="mt-4 inline-flex text-sm font-semibold text-primary hover:text-primary">
                          {customerName} — {activity.customer.customerCode}
                        </Link>
                      )}
                    </div>
                    <div className="shrink-0 sm:text-end">
                      <p className="font-semibold text-foreground-muted">{employeeName}</p>
                      {activity.createdBy && (
                        <p className="mt-1 text-xs text-foreground-subtle">{roleLabel(activity.createdBy.role)} · {activity.createdBy.email}</p>
                      )}
                      {!activity.createdBy && metadataActorEmail && (
                        <p className="mt-1 text-xs text-foreground-subtle">{t(language, "مدير النظام", "System administrator")} · {metadataActorEmail}</p>
                      )}
                      <div className="mt-4 space-y-1 text-xs text-foreground-subtle">
                        {activity.branch && <p><span className="font-semibold text-foreground-muted">{t(language, "الفرع:", "Branch:")}</span> {activity.branch.name}</p>}
                        {activity.deviceName && <p><span className="font-semibold text-foreground-muted">{t(language, "الجهاز:", "Device:")}</span> {activity.deviceName}</p>}
                        {activity.ipAddress && <p dir="ltr" className="sm:text-end"><span className="font-semibold text-foreground-muted">IP:</span> {activity.ipAddress}</p>}
                        <p><span className="font-semibold text-foreground-muted">{t(language, "الوقت:", "Time:")}</span> {dateFormatter.format(activity.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        {totalPages > 1 && (
          <nav className="mt-8 flex items-center justify-center gap-4" aria-label={t(language, "صفحات سجل النشاط", "Activity log pages")}>
            {currentPage > 1 ? (
              <Link href={getPageUrl(currentPage - 1)} className="rounded-[var(--lf-radius-input)] border border-border bg-white px-6 py-4 font-semibold text-foreground-muted">{t(language, "→ السابق", "← Previous")}</Link>
            ) : (
              <span className="cursor-not-allowed rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle px-6 py-4 font-semibold text-foreground-subtle">{t(language, "→ السابق", "← Previous")}</span>
            )}
            <span className="rounded-[var(--lf-radius-input)] bg-foreground px-6 py-4 font-semibold text-white">{currentPage} / {totalPages}</span>
            {currentPage < totalPages ? (
              <Link href={getPageUrl(currentPage + 1)} className="rounded-[var(--lf-radius-input)] border border-border bg-white px-6 py-4 font-semibold text-foreground-muted">{t(language, "التالي ←", "Next →")}</Link>
            ) : (
              <span className="cursor-not-allowed rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle px-6 py-4 font-semibold text-foreground-subtle">{t(language, "التالي ←", "Next →")}</span>
            )}
          </nav>
        )}
      </div>
    </main>
  );
}
