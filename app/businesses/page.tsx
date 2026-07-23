import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "../../generated/prisma/client";

import { createBusinessAction } from "./actions";
import BusinessSetupWizard from "@/components/business-setup-wizard";

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
    <main className="min-h-screen bg-slate-100 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-violet-600 hover:text-violet-800"
            >
              ← Back to dashboard
            </Link>

            <h1 className="mt-2 text-3xl font-bold text-slate-950">
              Businesses
            </h1>

            <p className="mt-1 text-slate-500">
              Add and manage your agency clients.
            </p>
          </div>

          <div className="rounded-xl bg-slate-950 px-5 py-3 text-white">
            <span className="text-sm text-slate-400">Total businesses</span>
            <strong className="ml-3 text-xl">{totalBusinesses}</strong>
          </div>
        </header>

        {params.created === "1" && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
            Business created successfully.
          </div>
        )}

        {params.error === "invalid" && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
            Please check the entered information.
          </div>
        )}

        {params.error === "slug-generation" && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
            We could not safely generate a unique business link. Please try again.
          </div>
        )}

        {params.error === "owner-email" && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
            An account with this owner email already exists.
          </div>
        )}


        <div className="grid gap-8 lg:grid-cols-[420px_1fr]">

          <section className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">
              Add new business
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Create an independent loyalty program for a client.
            </p>

            <BusinessSetupWizard
              action={createBusinessAction}
            />

          </section>

          <section>
            <form
              action="/businesses"
              className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              {params.created && <input type="hidden" name="created" value={params.created} />}
              {params.error && <input type="hidden" name="error" value={params.error} />}

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <input
                  type="search"
                  name="q"
                  defaultValue={query}
                  placeholder="Search businesses"
                  aria-label="Search businesses"
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                />

                <select name="status" defaultValue={status} aria-label="Filter by status" className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100">
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>

                <select name="industry" defaultValue={industry} aria-label="Filter by industry" className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100">
                  <option value="">All industries</option>
                  {industries.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>

                <select name="country" defaultValue={country} aria-label="Filter by country" className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100">
                  <option value="">All countries</option>
                  {countries.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>

                <select name="currency" defaultValue={currency} aria-label="Filter by currency" className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100">
                  <option value="">All currencies</option>
                  {currencies.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>

                <select name="sort" defaultValue={sort} aria-label="Sort businesses" className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100">
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="name_asc">Name: A to Z</option>
                  <option value="name_desc">Name: Z to A</option>
                </select>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button type="submit" className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700">
                  Apply
                </button>
                {hasActiveFilters && (
                  <Link href={buildBusinessesUrl(1, false)} className="text-sm font-medium text-violet-600 hover:text-violet-800">
                    Clear filters
                  </Link>
                )}
                <p className="text-sm text-slate-500">
                  {filteredBusinesses} {filteredBusinesses === 1 ? "result" : "results"} from {totalBusinesses} {totalBusinesses === 1 ? "business" : "businesses"}
                </p>
              </div>
            </form>

            {businesses.length === 0 && totalBusinesses === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <h2 className="text-xl font-semibold text-slate-900">
                  No businesses yet
                </h2>

                <p className="mt-2 text-slate-500">
                  Use the form to add your first loyalty card client.
                </p>
              </div>
            ) : businesses.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <h2 className="text-xl font-semibold text-slate-900">
                  No matching businesses
                </h2>

                <p className="mt-2 text-slate-500">
                  Try adjusting or clearing your search and filters.
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-5 sm:grid-cols-2">
                  {businesses.map((business) => (
                  <Link
                    key={business.id}
                    href={`/businesses/${business.slug}`}
                    className="group block overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-violet-300 hover:shadow-lg"
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
                          <h2 className="text-xl font-bold text-slate-950">
                            {business.name}
                          </h2>

                          <p className="mt-1 text-sm text-slate-500">
                            /{business.slug}
                          </p>
                        </div>

                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${business.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>
                          {business.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div className="mt-6 grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-slate-100 p-4">
                          <p className="text-xs text-slate-500">Customers</p>
                          <p className="mt-1 text-2xl font-bold">
                            {business._count.customers}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-100 p-4">
                          <p className="text-xs text-slate-500">Users</p>
                          <p className="mt-1 text-2xl font-bold">
                            {business._count.users}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 rounded-xl border border-slate-200 p-4 text-sm text-slate-600">
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

                      <div className="mt-5 flex items-center justify-between rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white transition group-hover:bg-violet-700">
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
                      <Link href={buildBusinessesUrl(currentPage - 1)} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-violet-300 hover:text-violet-700">
                        ← Previous
                      </Link>
                    ) : <span />}

                    <span className="text-sm text-slate-500">
                      Page {currentPage} of {totalPages}
                    </span>

                    {currentPage < totalPages ? (
                      <Link href={buildBusinessesUrl(currentPage + 1)} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-violet-300 hover:text-violet-700">
                        Next →
                      </Link>
                    ) : <span />}
                  </nav>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
