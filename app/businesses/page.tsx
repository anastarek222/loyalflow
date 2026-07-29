import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "../../generated/prisma/client";


type BusinessesPageProps = {
  searchParams: Promise<{
    created?: string;
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

function isSortOption(value: string): value is SortOption {
  return Object.prototype.hasOwnProperty.call(SORT_OPTIONS, value);
}

function getSortOption(value: string | undefined): SortOption {
  return value && isSortOption(value) ? value : "newest";
}

function getPageNumber(page: string | undefined) {
  if (!page || !/^\d+$/.test(page)) {
    return 1;
  }

  const parsedPage = Number(page);
  return Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
}

function getFilterOptions(values: Array<string | null>) {
  return [...new Set(values.filter((value): value is string => Boolean(value?.trim())))]
    .sort((first, second) => first.localeCompare(second));
}

export default async function BusinessesPage({
  searchParams,
}: BusinessesPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const filterRecords = await prisma.business.findMany({
    select: {
      industry: true,
      country: true,
      currency: true,
    },
  });
  const industries = getFilterOptions(filterRecords.map(({ industry }) => industry));
  const countries = getFilterOptions(filterRecords.map(({ country }) => country));
  const currencies = getFilterOptions(filterRecords.map(({ currency }) => currency));

  const query = params.q?.trim().slice(0, 200) ?? "";
  const status = params.status === "active" || params.status === "inactive"
    ? params.status
    : "all";
  const industry = industries.includes(params.industry ?? "") ? params.industry! : "";
  const country = countries.includes(params.country ?? "") ? params.country! : "";
  const currency = currencies.includes(params.currency ?? "") ? params.currency! : "";
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
  const totalPages = Math.max(1, Math.ceil(filteredBusinesses / BUSINESSES_PER_PAGE));
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
    query || status !== "all" || industry || country || currency || sort !== "newest",
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
    <main className="min-h-screen bg-surface-subtle px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-primary hover:text-primary"
            >
              ← Back to dashboard
            </Link>

            <h1 className="mt-2 text-3xl font-bold text-foreground">
              Businesses
            </h1>

            <p className="mt-1 text-foreground-subtle">
              Add and manage your agency clients.
            </p>
          </div>

          <div className="flex items-center gap-3"><div className="rounded-[var(--lf-radius-input)] bg-foreground px-6 py-4 text-white"><span className="text-sm text-foreground-subtle">Total businesses</span><strong className="ml-4 text-xl">{totalBusinesses}</strong></div><Link href="/businesses/new" className="rounded-[var(--lf-radius-input)] bg-primary px-5 py-4 font-semibold text-white hover:bg-primary-hover">Add Business</Link></div>
        </header>

        {(params.created === "1" || params.created === "invitation") && (
          <div className="mb-6 rounded-[var(--lf-radius-input)] border border-success/30 bg-success-subtle px-4 py-4 text-success">
            {params.created === "invitation" ? "Owner invitation created. They can sign in to complete setup." : "Business created successfully."}
          </div>
        )}

        {params.error === "invalid" && (
          <div className="mb-6 rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-4 text-danger">
            Please check the entered information.
          </div>
        )}

        {params.error === "slug-generation" && (
          <div className="mb-6 rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-4 text-danger">
            We could not safely generate a unique business link. Please try again.
          </div>
        )}

        {params.error === "owner-email" && (
          <div className="mb-6 rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-4 text-danger">
            An account with this owner email already exists.
          </div>
        )}
        {params.error === "invitation-invalid" && <div className="mb-6 rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-4 text-danger">Check the owner invitation details.</div>}
        {params.error === "invite-unavailable" && <div className="mb-6 rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-4 text-danger">The invitation could not be created. Please try again.</div>}


        <section>
            <form
              action="/businesses"
              className="mb-6 rounded-[var(--lf-radius-card)] border border-border bg-white p-6 shadow-sm"
            >
              {params.created && <input type="hidden" name="created" value={params.created} />}
              {params.error && <input type="hidden" name="error" value={params.error} />}

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <input
                  type="search"
                  name="q"
                  defaultValue={query}
                  placeholder="Search businesses"
                  aria-label="Search businesses"
                  className="rounded-[var(--lf-radius-input)] border border-border px-4 py-2.5 text-sm text-foreground outline-none transition placeholder:text-foreground-subtle focus:border-primary/30 focus:ring-2 focus:ring-primary/20"
                />

                <select name="status" defaultValue={status} aria-label="Filter by status" className="rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/20">
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>

                <select name="industry" defaultValue={industry} aria-label="Filter by industry" className="rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/20">
                  <option value="">All industries</option>
                  {industries.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>

                <select name="country" defaultValue={country} aria-label="Filter by country" className="rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/20">
                  <option value="">All countries</option>
                  {countries.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>

                <select name="currency" defaultValue={currency} aria-label="Filter by currency" className="rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/20">
                  <option value="">All currencies</option>
                  {currencies.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>

                <select name="sort" defaultValue={sort} aria-label="Sort businesses" className="rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/20">
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="name_asc">Name: A to Z</option>
                  <option value="name_desc">Name: Z to A</option>
                </select>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4">
                <button type="submit" className="rounded-[var(--lf-radius-input)] bg-foreground px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-subtle">
                  Apply
                </button>
                {hasActiveFilters && (
                  <Link href={buildBusinessesUrl(1, false)} className="text-sm font-medium text-primary hover:text-primary">
                    Clear filters
                  </Link>
                )}
                <p className="text-sm text-foreground-subtle">
                  {filteredBusinesses} {filteredBusinesses === 1 ? "result" : "results"} from {totalBusinesses} {totalBusinesses === 1 ? "business" : "businesses"}
                </p>
              </div>
            </form>

            {businesses.length === 0 && totalBusinesses === 0 ? (
              <div className="rounded-[var(--lf-radius-card)] border border-dashed border-border bg-white p-12 text-center">
                <h2 className="text-xl font-semibold text-foreground">
                  No businesses yet
                </h2>

                <p className="mt-2 text-foreground-subtle">
                  Use the form to add your first loyalty card client.
                </p>
              </div>
            ) : businesses.length === 0 ? (
              <div className="rounded-[var(--lf-radius-card)] border border-dashed border-border bg-white p-12 text-center">
                <h2 className="text-xl font-semibold text-foreground">
                  No matching businesses
                </h2>

                <p className="mt-2 text-foreground-subtle">
                  Try adjusting or clearing your search and filters.
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-6 sm:grid-cols-2">
                  {businesses.map((business) => (
                  <Link
                    key={business.id}
                    href={`/businesses/${business.slug}`}
                    className="group block overflow-hidden rounded-[var(--lf-radius-card)] border border-border bg-white shadow-sm transition hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
                  >
                    <div
                      className="h-3"
                      style={{
                        backgroundColor: business.primaryColor,
                      }}
                    />

                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h2 className="text-xl font-bold text-foreground">
                            {business.name}
                          </h2>

                          <p className="mt-1 text-sm text-foreground-subtle">
                            /{business.slug}
                          </p>
                        </div>

                        <span className={`rounded-full px-4 py-1 text-xs font-semibold ${business.isActive ? "bg-success-subtle text-success" : "bg-surface-subtle text-foreground-muted"}`}>
                          {business.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div className="mt-6 grid grid-cols-2 gap-4">
                        <div className="rounded-[var(--lf-radius-input)] bg-surface-subtle p-4">
                          <p className="text-xs text-foreground-subtle">Customers</p>
                          <p className="mt-1 text-2xl font-bold">
                            {business._count.customers}
                          </p>
                        </div>

                        <div className="rounded-[var(--lf-radius-input)] bg-surface-subtle p-4">
                          <p className="text-xs text-foreground-subtle">Users</p>
                          <p className="mt-1 text-2xl font-bold">
                            {business._count.users}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 rounded-[var(--lf-radius-input)] border border-border p-4 text-sm text-foreground-muted">
                        <p>
                          System:{" "}
                          <strong>{business.loyaltyMode}</strong>
                        </p>
                        <p className="mt-1">
                          Reward:{" "}
                          <strong>
                            {business.rewardName} after{" "}
                            {business.rewardThreshold} {business.unitName}
                          </strong>
                        </p>
                      </div>

                      <div className="mt-6 flex items-center justify-between rounded-[var(--lf-radius-input)] bg-foreground px-6 py-4 font-semibold text-white transition group-hover:bg-primary-subtle">
                        <span>Open business</span>
                        <span>→</span>
                      </div>
                    </div>
                  </Link>
                  ))}
                </div>

                {totalPages > 1 && (
                  <nav aria-label="Business pages" className="mt-6 flex items-center justify-between gap-4">
                    {currentPage > 1 ? (
                      <Link href={buildBusinessesUrl(currentPage - 1)} className="rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-2 text-sm font-medium text-foreground-muted transition hover:border-primary/30 hover:text-primary">
                        ← Previous
                      </Link>
                    ) : <span />}

                    <span className="text-sm text-foreground-subtle">
                      Page {currentPage} of {totalPages}
                    </span>

                    {currentPage < totalPages ? (
                      <Link href={buildBusinessesUrl(currentPage + 1)} className="rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-2 text-sm font-medium text-foreground-muted transition hover:border-primary/30 hover:text-primary">
                        Next →
                      </Link>
                    ) : <span />}
                  </nav>
                )}
              </>
            )}
        </section>
      </div>
    </main>
  );
}
