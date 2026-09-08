import { auth } from "@/auth";
import { PageHeader } from "@/components/page-layout";
import { ResponsiveFilterPanel } from "@/components/responsive-filter-panel";
import type { Prisma } from "@/generated/prisma/client";
import { normalizeLanguage } from "@/lib/i18n";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";

type BusinessesPageProps = {
  searchParams: Promise<{
    created?: string;
    businessDelete?: string;
    error?: string;
    q?: string;
    status?: string;
    industry?: string;
    country?: string;
    currency?: string;
    sort?: string;
    page?: string;
  }>;
};

const BUSINESSES_PER_PAGE = 10;

const SORT_OPTIONS = {
  newest: { createdAt: "desc" },
  oldest: { createdAt: "asc" },
  name_asc: { name: "asc" },
  name_desc: { name: "desc" },
} as const satisfies Record<string, Prisma.BusinessOrderByWithRelationInput>;

type SortOption = keyof typeof SORT_OPTIONS;

type Language = "AR" | "EN";

function isSortOption(value: string): value is SortOption {
  return Object.prototype.hasOwnProperty.call(SORT_OPTIONS, value);
}

function getSortOption(value: string | undefined): SortOption {
  return value && isSortOption(value) ? value : "newest";
}

function getPageNumber(page: string | undefined) {
  if (!page || !/^\d+$/.test(page)) return 1;
  const parsedPage = Number(page);
  return Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
}

function getFilterOptions(values: Array<string | null>) {
  return [
    ...new Set(values.filter((value): value is string => Boolean(value?.trim()))),
  ].sort((first, second) => first.localeCompare(second));
}

function loyaltyModeLabel(mode: string, language: Language) {
  if (mode === "VISITS") return language === "AR" ? "زيارات" : "Visits";
  if (mode === "POINTS") return language === "AR" ? "نقاط" : "Points";
  if (mode === "SALES_AMOUNT")
    return language === "AR" ? "قيمة المبيعات" : "Sales amount";
  return mode;
}

export default async function BusinessesPage({
  searchParams,
}: BusinessesPageProps) {
  const session = await auth();

  if (!session?.user) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN") redirect("/dashboard");

  const params = await searchParams;
  const [currentUser, filterRecords] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { language: true },
    }),
    prisma.business.findMany({
      select: {
        industry: true,
        country: true,
        currency: true,
      },
    }),
  ]);
  const language = normalizeLanguage(currentUser?.language);
  const copy =
    language === "AR"
      ? {
          eyebrow: "إدارة المنصة",
          title: "الأنشطة التجارية",
          description: "أضف أنشطة عملائك وأدرها من مساحة تشغيل واحدة.",
          back: "العودة إلى لوحة التحكم",
          total: "إجمالي الأنشطة",
          add: "إضافة نشاط",
          created: "تم إنشاء النشاط بنجاح.",
          deleted: "تم حذف النشاط نهائيًا مع الاحتفاظ بحسابات المستخدمين.",
          invalid: "راجع البيانات المدخلة.",
          slugGeneration:
            "تعذر إنشاء رابط فريد وآمن للنشاط. حاول مرة أخرى.",
          ownerEmail: "يوجد حساب بالفعل ببريد المالك هذا.",
          search: "البحث في الأنشطة",
          searchPlaceholder: "ابحث بالاسم أو الرابط أو بيانات التواصل",
          status: "تصفية حسب الحالة",
          allStatuses: "كل الحالات",
          active: "نشط",
          inactive: "غير نشط",
          industry: "تصفية حسب المجال",
          allIndustries: "كل المجالات",
          country: "تصفية حسب الدولة",
          allCountries: "كل الدول",
          currency: "تصفية حسب العملة",
          allCurrencies: "كل العملات",
          sort: "ترتيب الأنشطة",
          newest: "الأحدث أولًا",
          oldest: "الأقدم أولًا",
          nameAsc: "الاسم: أ إلى ي",
          nameDesc: "الاسم: ي إلى أ",
          apply: "تطبيق",
          clear: "مسح الفلاتر",
          results: (filtered: number, total: number) =>
            `${filtered} نتيجة من ${total} نشاط`,
          noBusinesses: "لا توجد أنشطة حتى الآن",
          noBusinessesDescription:
            "أضف أول نشاط تجاري لبدء إعداد برنامج الولاء.",
          noMatches: "لا توجد أنشطة مطابقة",
          noMatchesDescription: "عدّل البحث أو الفلاتر، أو امسحها لعرض كل الأنشطة.",
          customers: "العملاء",
          users: "المستخدمون",
          system: "النظام",
          reward: "المكافأة",
          after: "بعد",
          open: "فتح النشاط",
          pages: "صفحات الأنشطة",
          previous: "السابق",
          next: "التالي",
          pageOf: (page: number, total: number) => `صفحة ${page} من ${total}`,
        }
      : {
          eyebrow: "Platform administration",
          title: "Businesses",
          description: "Add and manage client businesses from one operations workspace.",
          back: "Back to dashboard",
          total: "Total businesses",
          add: "Add business",
          created: "Business created successfully.",
          deleted: "Business deleted permanently. User accounts were preserved.",
          invalid: "Please check the entered information.",
          slugGeneration:
            "We could not safely generate a unique business link. Please try again.",
          ownerEmail: "An account with this owner email already exists.",
          search: "Search businesses",
          searchPlaceholder: "Search by name, slug, or contact details",
          status: "Filter by status",
          allStatuses: "All statuses",
          active: "Active",
          inactive: "Inactive",
          industry: "Filter by industry",
          allIndustries: "All industries",
          country: "Filter by country",
          allCountries: "All countries",
          currency: "Filter by currency",
          allCurrencies: "All currencies",
          sort: "Sort businesses",
          newest: "Newest first",
          oldest: "Oldest first",
          nameAsc: "Name: A to Z",
          nameDesc: "Name: Z to A",
          apply: "Apply",
          clear: "Clear filters",
          results: (filtered: number, total: number) =>
            `${filtered} ${filtered === 1 ? "result" : "results"} from ${total} ${total === 1 ? "business" : "businesses"}`,
          noBusinesses: "No businesses yet",
          noBusinessesDescription:
            "Add your first business to begin configuring its loyalty programme.",
          noMatches: "No matching businesses",
          noMatchesDescription: "Adjust or clear the search and filters to see more businesses.",
          customers: "Customers",
          users: "Users",
          system: "System",
          reward: "Reward",
          after: "after",
          open: "Open business",
          pages: "Business pages",
          previous: "Previous",
          next: "Next",
          pageOf: (page: number, total: number) => `Page ${page} of ${total}`,
        };

  const industries = getFilterOptions(
    filterRecords.map(({ industry }) => industry),
  );
  const countries = getFilterOptions(filterRecords.map(({ country }) => country));
  const currencies = getFilterOptions(
    filterRecords.map(({ currency }) => currency),
  );

  const query = params.q?.trim().slice(0, 200) ?? "";
  const status =
    params.status === "active" || params.status === "inactive"
      ? params.status
      : "all";
  const industry = industries.includes(params.industry ?? "")
    ? params.industry!
    : "";
  const country = countries.includes(params.country ?? "") ? params.country! : "";
  const currency = currencies.includes(params.currency ?? "")
    ? params.currency!
    : "";
  const sort = getSortOption(params.sort);

  const where: Prisma.BusinessWhereInput = {
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { slug: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
            { contactPhone: { contains: query, mode: "insensitive" } },
            { industry: { contains: query, mode: "insensitive" } },
            { country: { contains: query, mode: "insensitive" } },
            { city: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(status === "all" ? {} : { isActive: status === "active" }),
    ...(industry ? { industry } : {}),
    ...(country ? { country } : {}),
    ...(currency ? { currency } : {}),
  };

  const [totalBusinesses, filteredBusinesses] = await Promise.all([
    prisma.business.count(),
    prisma.business.count({ where }),
  ]);
  const totalPages = Math.max(
    1,
    Math.ceil(filteredBusinesses / BUSINESSES_PER_PAGE),
  );
  const currentPage = Math.min(getPageNumber(params.page), totalPages);
  const businesses = await prisma.business.findMany({
    where,
    orderBy: SORT_OPTIONS[sort],
    skip: (currentPage - 1) * BUSINESSES_PER_PAGE,
    take: BUSINESSES_PER_PAGE,
    include: {
      _count: {
        select: {
          customers: true,
          users: true,
        },
      },
    },
  });

  const hasActiveFilters = Boolean(
    query ||
      status !== "all" ||
      industry ||
      country ||
      currency ||
      sort !== "newest",
  );

  const buildBusinessesUrl = (page = 1, includeFilters = true) => {
    const urlParams = new URLSearchParams();

    if (params.created) urlParams.set("created", params.created);
    if (params.error) urlParams.set("error", params.error);

    if (includeFilters) {
      if (query) urlParams.set("q", query);
      if (status !== "all") urlParams.set("status", status);
      if (industry) urlParams.set("industry", industry);
      if (country) urlParams.set("country", country);
      if (currency) urlParams.set("currency", currency);
      if (sort !== "newest") urlParams.set("sort", sort);
    }

    if (page > 1) urlParams.set("page", String(page));

    const search = urlParams.toString();
    return search ? `/businesses?${search}` : "/businesses";
  };

  return (
    <main
      className="min-h-screen bg-surface-subtle px-4 py-8 sm:px-8"
      dir={language === "AR" ? "rtl" : "ltr"}
      data-businesses-language={language}
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <Link
          href="/dashboard"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:text-primary-hover"
        >
          {language === "AR" ? "→" : "←"} {copy.back}
        </Link>

        <PageHeader
          eyebrow={copy.eyebrow}
          title={copy.title}
          description={copy.description}
          secondaryActions={
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-[var(--lf-radius-md)] border border-border bg-surface-subtle px-4 py-3">
                <span className="text-xs font-semibold text-foreground-subtle">
                  {copy.total}
                </span>
                <strong className="ms-3 text-lg text-foreground">
                  {totalBusinesses}
                </strong>
              </div>
              <Link
                href="/businesses/new"
                className="inline-flex min-h-11 items-center rounded-[var(--lf-radius-md)] bg-primary px-5 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                {copy.add}
              </Link>
            </div>
          }
        />

        {params.created === "1" && (
          <div className="rounded-[var(--lf-radius-md)] border border-success/30 bg-success-subtle px-4 py-4 text-success">
            {copy.created}
          </div>
        )}
        {params.businessDelete === "success" ? (
          <div
            role="status"
            className="rounded-[var(--lf-radius-md)] border border-success/30 bg-success-subtle px-4 py-4 text-success"
          >
            {copy.deleted}
          </div>
        ) : null}

        {params.error === "invalid" && (
          <div className="rounded-[var(--lf-radius-md)] border border-danger/30 bg-danger-subtle px-4 py-4 text-danger">
            {copy.invalid}
          </div>
        )}
        {params.error === "slug-generation" && (
          <div className="rounded-[var(--lf-radius-md)] border border-danger/30 bg-danger-subtle px-4 py-4 text-danger">
            {copy.slugGeneration}
          </div>
        )}
        {params.error === "owner-email" && (
          <div className="rounded-[var(--lf-radius-md)] border border-danger/30 bg-danger-subtle px-4 py-4 text-danger">
            {copy.ownerEmail}
          </div>
        )}

        <section>
          <ResponsiveFilterPanel
            title={language === "AR" ? "البحث والفلاتر" : "Search & filters"}
            showLabel={language === "AR" ? "إظهار" : "Show"}
            hideLabel={language === "AR" ? "إخفاء" : "Hide"}
            defaultOpen={hasActiveFilters}
          >
            <form
              action="/businesses"
              className="mb-6 rounded-[var(--lf-radius-lg)] border border-border bg-surface p-6 shadow-[var(--lf-shadow-raised)]"
            >
            {params.created && (
              <input type="hidden" name="created" value={params.created} />
            )}
            {params.error && (
              <input type="hidden" name="error" value={params.error} />
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder={copy.searchPlaceholder}
                aria-label={copy.search}
                className="rounded-[var(--lf-radius-md)] border border-border bg-surface px-4 py-2.5 text-sm text-foreground outline-none transition placeholder:text-foreground-subtle focus:border-primary/30 focus:ring-2 focus:ring-primary/20"
              />

              <select
                name="status"
                defaultValue={status}
                aria-label={copy.status}
                className="rounded-[var(--lf-radius-md)] border border-border bg-surface px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">{copy.allStatuses}</option>
                <option value="active">{copy.active}</option>
                <option value="inactive">{copy.inactive}</option>
              </select>

              <select
                name="industry"
                defaultValue={industry}
                aria-label={copy.industry}
                className="rounded-[var(--lf-radius-md)] border border-border bg-surface px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/20"
              >
                <option value="">{copy.allIndustries}</option>
                {industries.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <select
                name="country"
                defaultValue={country}
                aria-label={copy.country}
                className="rounded-[var(--lf-radius-md)] border border-border bg-surface px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/20"
              >
                <option value="">{copy.allCountries}</option>
                {countries.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <select
                name="currency"
                defaultValue={currency}
                aria-label={copy.currency}
                className="rounded-[var(--lf-radius-md)] border border-border bg-surface px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/20"
              >
                <option value="">{copy.allCurrencies}</option>
                {currencies.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>

              <select
                name="sort"
                defaultValue={sort}
                aria-label={copy.sort}
                className="rounded-[var(--lf-radius-md)] border border-border bg-surface px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/20"
              >
                <option value="newest">{copy.newest}</option>
                <option value="oldest">{copy.oldest}</option>
                <option value="name_asc">{copy.nameAsc}</option>
                <option value="name_desc">{copy.nameDesc}</option>
              </select>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-4">
              <button
                type="submit"
                className="rounded-[var(--lf-radius-md)] bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                {copy.apply}
              </button>
              {hasActiveFilters && (
                <Link
                  href={buildBusinessesUrl(1, false)}
                  className="text-sm font-medium text-primary hover:text-primary-hover"
                >
                  {copy.clear}
                </Link>
              )}
              <p className="text-sm text-foreground-subtle">
                {copy.results(filteredBusinesses, totalBusinesses)}
              </p>
            </div>
            </form>
          </ResponsiveFilterPanel>

          {businesses.length === 0 && totalBusinesses === 0 ? (
            <div className="rounded-[var(--lf-radius-lg)] border border-dashed border-border bg-surface p-12 text-center">
              <h2 className="text-xl font-semibold text-foreground">
                {copy.noBusinesses}
              </h2>
              <p className="mt-2 text-foreground-subtle">
                {copy.noBusinessesDescription}
              </p>
            </div>
          ) : businesses.length === 0 ? (
            <div className="rounded-[var(--lf-radius-lg)] border border-dashed border-border bg-surface p-12 text-center">
              <h2 className="text-xl font-semibold text-foreground">
                {copy.noMatches}
              </h2>
              <p className="mt-2 text-foreground-subtle">
                {copy.noMatchesDescription}
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2">
                {businesses.map((business) => (
                  <Link
                    key={business.id}
                    href={`/businesses/${business.slug}`}
                    className="group block overflow-hidden rounded-[var(--lf-radius-lg)] border border-border bg-surface shadow-[var(--lf-shadow-raised)] transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[var(--lf-shadow-overlay)]"
                  >
                    <div
                      className="h-3"
                      style={{ backgroundColor: business.primaryColor }}
                    />

                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h2 className="truncate text-xl font-bold text-foreground">
                            {business.name}
                          </h2>
                          <p
                            dir="ltr"
                            className="mt-1 text-start text-sm text-foreground-subtle"
                          >
                            /{business.slug}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-4 py-1 text-xs font-semibold ${
                            business.isActive
                              ? "bg-success-subtle text-success"
                              : "bg-surface-subtle text-foreground-muted"
                          }`}
                        >
                          {business.isActive ? copy.active : copy.inactive}
                        </span>
                      </div>

                      <div className="mt-6 grid grid-cols-2 gap-4">
                        <div className="rounded-[var(--lf-radius-md)] bg-surface-subtle p-4">
                          <p className="text-xs text-foreground-subtle">
                            {copy.customers}
                          </p>
                          <p className="mt-1 text-2xl font-bold text-foreground">
                            {business._count.customers}
                          </p>
                        </div>

                        <div className="rounded-[var(--lf-radius-md)] bg-surface-subtle p-4">
                          <p className="text-xs text-foreground-subtle">
                            {copy.users}
                          </p>
                          <p className="mt-1 text-2xl font-bold text-foreground">
                            {business._count.users}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 rounded-[var(--lf-radius-md)] border border-border p-4 text-sm text-foreground-muted">
                        <p>
                          {copy.system}: {" "}
                          <strong>
                            {loyaltyModeLabel(business.loyaltyMode, language)}
                          </strong>
                        </p>
                        <p className="mt-1">
                          {copy.reward}: {" "}
                          <strong>
                            {business.rewardName} {copy.after}{" "}
                            {business.rewardThreshold} {business.unitName}
                          </strong>
                        </p>
                      </div>

                      <div className="mt-6 flex items-center justify-between rounded-[var(--lf-radius-md)] bg-foreground px-6 py-4 font-semibold text-[var(--lf-inverse)] transition-colors group-hover:bg-primary">
                        <span>{copy.open}</span>
                        <span>{language === "AR" ? "←" : "→"}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {totalPages > 1 && (
                <nav
                  aria-label={copy.pages}
                  className="mt-6 flex items-center justify-between gap-4"
                >
                  {currentPage > 1 ? (
                    <Link
                      href={buildBusinessesUrl(currentPage - 1)}
                      className="rounded-[var(--lf-radius-md)] border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground-muted transition hover:border-primary/30 hover:text-primary"
                    >
                      {language === "AR" ? "→" : "←"} {copy.previous}
                    </Link>
                  ) : (
                    <span />
                  )}

                  <span className="text-sm text-foreground-subtle">
                    {copy.pageOf(currentPage, totalPages)}
                  </span>

                  {currentPage < totalPages ? (
                    <Link
                      href={buildBusinessesUrl(currentPage + 1)}
                      className="rounded-[var(--lf-radius-md)] border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground-muted transition hover:border-primary/30 hover:text-primary"
                    >
                      {copy.next} {language === "AR" ? "←" : "→"}
                    </Link>
                  ) : (
                    <span />
                  )}
                </nav>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
