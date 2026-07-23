import { auth } from "@/auth";
import {
  getCustomerFilterSegments,
  getCustomerSegment,
  getCustomerSegmentLabel,
  getCustomerSegmentWhere,
  type CustomerSegment,
} from "@/lib/customers/segments";
import { calculateRewardProgress } from "@/lib/loyalty/progress";
import { getCustomerTagWhere } from "@/lib/customers/notes-tags";
import {
  canAccessBusiness,
  canExportBusinessData,
  canManageBusiness,
  canPerform,
} from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { getBusinessTheme } from "@/lib/theme";
import {
  getExperienceModeCookieName,
  resolveExperienceMode,
} from "@/lib/experience-mode";
import { ListPageTemplate, PageHeader } from "@/components/page-layout";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import BulkCustomerOperations from "@/components/bulk-customer-operations";
import { getLanguageLocale, normalizeLanguage } from "@/lib/i18n";
import { customerUiCopy } from "@/lib/customers/ui-copy";

import { bulkCustomerAction, createCustomerAction } from "./actions";

const CUSTOMERS_PER_PAGE = 10;

type CustomersPageProps = {
  params: Promise<{
    slug: string;
  }>;

  searchParams: Promise<{
    created?: string;
    error?: string;
    q?: string;
    segment?: string;
    status?: string;
    sort?: string;
    tag?: string;
    bulk?: string;
    selected?: string;
    changed?: string;
    page?: string;
  }>;
};

export default async function CustomersPage({
  params,
  searchParams,
}: CustomersPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const authenticatedUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { language: true },
  });

  const { slug } = await params;
  const query = await searchParams;
  const language = normalizeLanguage(authenticatedUser?.language);
  const copy = customerUiCopy(language);
  const dateLocale = getLanguageLocale(language);
  const experienceMode = resolveExperienceMode(
    (await cookies()).get(getExperienceModeCookieName(session.user.id))?.value,
    session.user.role,
  );
  const isSimpleExperience = experienceMode === "SIMPLE";

  const business = await prisma.business.findUnique({
    where: {
      slug,
    },
  });

  if (!business) {
    notFound();
  }

  const theme =
    getBusinessTheme(business);

  if (!canAccessBusiness(session.user, business.id)) {
    redirect("/dashboard");
  }

  const search = query.q?.trim() ?? "";

  const businessTags = await prisma.customerTag.findMany({
    where: { businessId: business.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const selectedTagId = businessTags.some((tag) => tag.id === query.tag)
    ? query.tag!
    : null;

  const status =
    query.status === "active" || query.status === "inactive"
      ? query.status
      : "all";

  const availableSegments = getCustomerFilterSegments(
    business.loyaltyMode
  );

  const segment = availableSegments.includes(
    query.segment as CustomerSegment
  )
    ? (query.segment as CustomerSegment)
    : null;

  const allowedSorts = ["newest", "oldest", "balance_high", "balance_low"];

  const sort = allowedSorts.includes(query.sort ?? "") ? query.sort! : "newest";

  const parsedPage = Number.parseInt(query.page ?? "1", 10);

  const requestedPage =
    Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const customerFilters: Prisma.CustomerWhereInput[] = [
    {
      businessId: business.id,
    },
  ];

  if (status === "active") {
    customerFilters.push({
      isActive: true,
    });
  }

  if (status === "inactive") {
    customerFilters.push({
      isActive: false,
    });
  }

  if (search) {
    const nameParts = search
      .split(/\s+/)
      .filter(Boolean);

    const searchFilters: Prisma.CustomerWhereInput[] = [
      {
        firstName: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        lastName: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        phone: {
          contains: search,
        },
      },
      {
        customerCode: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];

    if (nameParts.length >= 2) {
      searchFilters.push({
        AND: [
          {
            firstName: {
              contains: nameParts[0],
              mode: "insensitive",
            },
          },
          {
            lastName: {
              contains: nameParts.slice(1).join(" "),
              mode: "insensitive",
            },
          },
        ],
      });
    }

    customerFilters.push({
      OR: searchFilters,
    });
  }

  if (segment) {
    customerFilters.push(
      getCustomerSegmentWhere(
        segment,
        business.rewardThreshold,
        undefined,
        business.earnAmount
      )
    );
  }

  if (selectedTagId) {
    customerFilters.push(getCustomerTagWhere(selectedTagId));
  }

  const customerWhere: Prisma.CustomerWhereInput = {
    AND: customerFilters,
  };

  const [totalCustomers, filteredCustomers] = await Promise.all([
    prisma.customer.count({
      where: {
        businessId: business.id,
      },
    }),

    prisma.customer.count({
      where: customerWhere,
    }),
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredCustomers / CUSTOMERS_PER_PAGE),
  );

  const currentPage = Math.min(requestedPage, totalPages);

  const orderBy =
    sort === "oldest"
      ? {
          createdAt: "asc" as const,
        }
      : sort === "balance_high"
        ? [
            {
              balance: "desc" as const,
            },
            {
              createdAt: "desc" as const,
            },
          ]
        : sort === "balance_low"
          ? [
              {
                balance: "asc" as const,
              },
              {
                createdAt: "desc" as const,
              },
            ]
          : {
              createdAt: "desc" as const,
            };

  const customers = await prisma.customer.findMany({
    where: customerWhere,
    orderBy,
    skip: (currentPage - 1) * CUSTOMERS_PER_PAGE,
    take: CUSTOMERS_PER_PAGE,
    include: {
      transactions: {
        select: {
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
      tagAssignments: {
        orderBy: { tag: { name: "asc" } },
        include: {
          tag: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  const createCustomer = createCustomerAction.bind(null, business.slug);

  function getPageUrl(pageNumber: number) {
    const parameters = new URLSearchParams();

    if (search) {
      parameters.set("q", search);
    }

    if (status !== "all") {
      parameters.set("status", status);
    }

    if (segment) {
      parameters.set("segment", segment);
    }

    if (selectedTagId) {
      parameters.set("tag", selectedTagId);
    }

    if (sort !== "newest") {
      parameters.set("sort", sort);
    }

    if (pageNumber > 1) {
      parameters.set("page", String(pageNumber));
    }

    const queryString = parameters.toString();

    return `/businesses/${slug}/customers${
      queryString ? `?${queryString}` : ""
    }`;
  }

  const lastResult = Math.min(
    currentPage * CUSTOMERS_PER_PAGE,
    filteredCustomers,
  );

  const firstResult =
    filteredCustomers === 0 ? 0 : (currentPage - 1) * CUSTOMERS_PER_PAGE + 1;

  const paginationStart = Math.max(
    1,
    Math.min(currentPage - 2, totalPages - 4),
  );

  const paginationEnd = Math.min(totalPages, paginationStart + 4);

  const paginationPages = Array.from(
    {
      length: paginationEnd - paginationStart + 1,
    },
    (_, index) => paginationStart + index,
  );

  const filtersActive =
    Boolean(search) ||
    status !== "all" ||
    Boolean(segment) ||
    Boolean(selectedTagId) ||
    sort !== "newest";

  const canExportData = canExportBusinessData(
    session.user,
    business.id,
    business.allowOwnerDataExport
  );
  const canReviewDuplicates = canPerform(
    session.user,
    business.id,
    "CUSTOMERS_EDIT"
  );
  const canScanCustomers = canPerform(session.user, business.id, "LOYALTY_EARN");
  const canUseCampaigns = canManageBusiness(session.user, business.id);
  const bulkAction = bulkCustomerAction.bind(null, business.slug);

  return (
    <main
      className="min-h-screen bg-slate-100 px-4 py-5 sm:px-8 sm:py-8"
      data-experience-mode={experienceMode}
      data-experience-customers={isSimpleExperience ? "simple" : "advanced"}
    >
      <ListPageTemplate
        container="wide"
        className="space-y-6"
        header={<PageHeader
          title={copy.customers}
          description={isSimpleExperience ? copy.simpleDescription : copy.advancedDescription(business.name)}
          status={<span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">{copy.customersCount(totalCustomers)}</span>}
          secondaryActions={<div className="flex flex-wrap items-center gap-2">
            <Link href={`/businesses/${business.slug}`} className="min-h-11 rounded-md px-3 py-2 text-sm font-semibold text-primary hover:bg-indigo-50">{copy.backToBusiness}</Link>
            {canReviewDuplicates ? <a href="#add-customer" className="inline-flex min-h-11 items-center rounded-md border border-primary bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover">{copy.addCustomer}</a> : null}
            {canScanCustomers ? <Link href={`/businesses/${business.slug}/scan`} className="inline-flex min-h-11 items-center rounded-md border border-primary bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover">{copy.scan}</Link> : null}
            {canReviewDuplicates && (
              <Link
                href={`/businesses/${business.slug}/duplicates`}
                className={`min-h-11 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100 ${isSimpleExperience ? "hidden" : ""}`}
              >
                {copy.reviewDuplicates}
              </Link>
            )}
            {canExportData && (
              <a
              href={`/businesses/${business.slug}/customers/export`}
              className={`min-h-11 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:border-emerald-400 hover:bg-emerald-50 ${isSimpleExperience ? "hidden" : ""}`}
            >
              {copy.exportCustomers}
            </a>
            )}
          </div>}
        />}
      >

        {query.created === "1" && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
            {copy.created}
          </div>
        )}

        {query.error === "invalid" && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
            {copy.invalidCustomer}
          </div>
        )}

        {query.error === "phone" && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
            {copy.invalidPhone}
          </div>
        )}

        {query.error === "duplicate" && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
            {copy.duplicatePhone}
          </div>
        )}

        {query.bulk && query.selected && query.changed && (
          <div className={`mb-6 rounded-xl border px-4 py-3 ${query.bulk === "invalid" || query.bulk === "invalid-selection" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>
            {query.bulk === "invalid" || query.bulk === "invalid-selection"
              ? copy.bulkInvalid
              : copy.bulkComplete(query.selected, query.changed)}
          </div>
        )}

        <div className={`grid gap-6 lg:gap-8 ${canReviewDuplicates ? "lg:grid-cols-[minmax(18rem,24rem)_1fr]" : ""}`}>
          {canReviewDuplicates ? <section id="add-customer" className="h-fit scroll-mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-bold text-slate-950">{copy.addCustomer}</h2>

            <p className="mt-1 text-sm text-slate-500">
              {copy.customerCodeHint}
            </p>

            <form action={createCustomer} className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="firstName"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  {copy.firstName}
                </label>

                <input
                  id="firstName"
                  name="firstName"
                  required
                  minLength={2}
                  maxLength={50}
                  placeholder={copy.firstNamePlaceholder}
                  dir="auto"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                />
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  {copy.lastName}
                </label>

                <input
                  id="lastName"
                  name="lastName"
                  maxLength={50}
                  placeholder={copy.lastNamePlaceholder}
                  dir="auto"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                />
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  {copy.phone}
                </label>

                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  dir="ltr"
                  placeholder="+201000000000"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-violet-700"
              >
                {copy.addCustomer}
              </button>
            </form>
          </section> : null}

          <section>
            {!isSimpleExperience && canReviewDuplicates ? (
              <BulkCustomerOperations
                customers={customers.map((customer) => ({
                  id: customer.id,
                  name: [customer.firstName, customer.lastName].filter(Boolean).join(" "),
                  phone: customer.phone,
                }))}
                tags={businessTags}
                action={bulkAction}
                exportUrl={`/businesses/${business.slug}/customers/export`}
                campaignUrl={`/businesses/${business.slug}/campaigns`}
                canExport={canExportData}
                canUseCampaigns={canUseCampaigns}
                language={language}
              />
            ) : null}
            <form className="mb-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_150px_150px_150px_190px_auto]">
                <div>
                  <label
                    htmlFor="q"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    {copy.search}
                  </label>

                  <input
                    id="q"
                    name="q"
                    defaultValue={search}
                    placeholder={copy.searchPlaceholder}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-violet-500"
                  />
                </div>

                <div className={isSimpleExperience ? "hidden" : undefined}>
                  <label
                    htmlFor="tag"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    {copy.tag}
                  </label>

                  <select
                    id="tag"
                    name="tag"
                    defaultValue={selectedTagId ?? ""}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-violet-500"
                  >
                    <option value="">{copy.allTags}</option>
                    {businessTags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={isSimpleExperience ? "hidden" : undefined}>
                  <label
                    htmlFor="status"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    {copy.status}
                  </label>

                  <select
                    id="status"
                    name="status"
                    defaultValue={status}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-violet-500"
                  >
                    <option value="all">{copy.allCustomers}</option>

                    <option value="active">{copy.active}</option>

                    <option value="inactive">{copy.inactive}</option>
                  </select>
                </div>

                <div className={isSimpleExperience ? "hidden" : undefined}>
                  <label
                    htmlFor="segment"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    {copy.segment}
                  </label>

                  <select
                    id="segment"
                    name="segment"
                    defaultValue={segment ?? ""}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-violet-500"
                  >
                    <option value="">{copy.allSegments}</option>
                    {availableSegments.map((value) => (
                      <option key={value} value={value}>
                        {getCustomerSegmentLabel(value, language)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={isSimpleExperience ? "hidden" : undefined}>
                  <label
                    htmlFor="sort"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    {copy.sort}
                  </label>

                  <select
                    id="sort"
                    name="sort"
                    defaultValue={sort}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-violet-500"
                  >
                    <option value="newest">{copy.newest}</option>

                    <option value="oldest">{copy.oldest}</option>

                    <option value="balance_high">{copy.balanceHigh}</option>

                    <option value="balance_low">{copy.balanceLow}</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full self-end rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white transition hover:bg-violet-700"
                >
                  {copy.apply}
                </button>
              </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-500">
                  {copy.results(firstResult, lastResult, filteredCustomers)}
                </p>

                {filtersActive && (
                  <Link
                    href={`/businesses/${business.slug}/customers`}
                    className="text-sm font-semibold text-violet-600 hover:text-violet-800"
                  >
                    {copy.resetFilters}
                  </Link>
                )}
              </div>
              {filtersActive ? <div aria-label={copy.activeFilters} className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
                {search ? <span className="rounded-full bg-slate-100 px-3 py-1">{copy.searchFilter}: {search}</span> : null}
                {status !== "all" ? <span className="rounded-full bg-slate-100 px-3 py-1">{status === "active" ? copy.active : copy.inactive}</span> : null}
                {segment ? <span className="rounded-full bg-slate-100 px-3 py-1">{copy.segmentFilter}: {getCustomerSegmentLabel(segment, language)}</span> : null}
                {selectedTagId ? <span className="rounded-full bg-slate-100 px-3 py-1">{copy.tagFilter}: {businessTags.find((tag) => tag.id === selectedTagId)?.name}</span> : null}
              </div> : null}
              {isSimpleExperience ? <details className="mt-3 rounded-md border border-border bg-surface-subtle px-3 py-2 text-sm">
                <summary className="cursor-pointer font-semibold text-slate-700">{copy.advancedOptions}</summary>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href={`/businesses/${business.slug}/customers?segment=REWARD_READY`} className="rounded-md border border-border bg-surface px-3 py-2 font-semibold text-primary">{copy.rewardReady}</Link>
                  <Link href={`/businesses/${business.slug}/customers?segment=AT_RISK`} className="rounded-md border border-border bg-surface px-3 py-2 font-semibold text-primary">{copy.atRisk}</Link>
                  <Link href={`/businesses/${business.slug}/customers?status=inactive`} className="rounded-md border border-border bg-surface px-3 py-2 font-semibold text-primary">{copy.suspendedAccounts}</Link>
                </div>
              </details> : null}
            </form>

            {customers.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <h2 className="text-xl font-semibold text-slate-900">
                  {totalCustomers === 0 ? copy.noCustomers : copy.noResults}
                </h2>

                <p className="mt-2 text-slate-500">
                  {totalCustomers === 0 ? copy.noCustomersDescription : copy.noResultsDescription}
                </p>

                {totalCustomers === 0 && canReviewDuplicates ? (
                  <a href="#add-customer" className="mt-5 inline-flex rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white">{copy.addCustomer}</a>
                ) : null}
                {filtersActive && (
                  <Link
                    href={`/businesses/${business.slug}/customers`}
                    className="mt-5 inline-flex rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white"
                  >
                    {copy.showAllCustomers}
                  </Link>
                )}
              </div>
            ) : (
              <>
                {!isSimpleExperience ? (
                  <div className="hidden overflow-hidden rounded-xl border border-border bg-surface shadow-sm lg:block">
                    <table className="w-full text-start">
                      <caption className="sr-only">{copy.customerList}</caption>
                      <thead className="border-b border-border bg-surface-subtle text-xs font-semibold text-slate-600">
                        <tr>
                          <th scope="col" className="px-5 py-3 text-start">{copy.customer}</th>
                          <th scope="col" className="px-5 py-3 text-start">{copy.contact}</th>
                          <th scope="col" className="px-5 py-3 text-start">{copy.loyalty}</th>
                          <th scope="col" className="px-5 py-3 text-start">{copy.status}</th>
                          <th scope="col" className="px-5 py-3 text-start">{copy.lastActivity}</th>
                          <th scope="col" className="px-5 py-3 text-end"><span className="sr-only">{copy.action}</span></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {customers.map((customer) => {
                          const { progress, rewardAvailable } = calculateRewardProgress(customer.balance, business.rewardThreshold, customer.isActive);
                          const customerSegment = getCustomerSegment({ isActive: customer.isActive, createdAt: customer.createdAt, lastActivityAt: customer.transactions[0]?.createdAt ?? null, lifetimeEarned: customer.lifetimeEarned, rewardThreshold: business.rewardThreshold });
                          return <tr key={customer.id} className="hover:bg-surface-subtle">
                            <td className="px-5 py-4"><Link href={`/businesses/${business.slug}/customers/${customer.id}`} className="font-semibold text-slate-950 hover:text-primary" dir="auto">{customer.firstName} {customer.lastName ?? ""}</Link><p dir="ltr" className="mt-1 text-xs text-slate-500">{customer.customerCode}</p></td>
                            <td className="px-5 py-4 text-sm text-slate-700"><span dir="ltr">{customer.phone}</span></td>
                            <td className="px-5 py-4"><p className="font-semibold text-slate-950"><span dir="ltr" className="lf-type-numeric">{customer.balance}</span> <span dir="auto" className="text-sm font-normal text-slate-600">{business.unitName}</span></p><div className="mt-2 h-1.5 w-28 overflow-hidden rounded-full bg-slate-200" aria-label={copy.progress(progress)}><div className="h-full bg-primary" style={{ width: `${progress}%` }} /></div></td>
                            <td className="px-5 py-4"><div className="flex flex-wrap gap-1"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{getCustomerSegmentLabel(customerSegment, language)}</span>{rewardAvailable ? <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">{copy.rewardReady}</span> : null}</div></td>
                            <td className="px-5 py-4 text-sm text-slate-600">{customer.transactions[0] ? customer.transactions[0].createdAt.toLocaleDateString(dateLocale) : copy.noActivity}</td>
                            <td className="px-5 py-4 text-end"><Link href={`/businesses/${business.slug}/customers/${customer.id}`} className="inline-flex min-h-10 items-center rounded-md px-3 text-sm font-semibold text-primary hover:bg-indigo-50">{copy.openProfile}</Link></td>
                          </tr>;
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : null}
                <div className={`space-y-4 ${isSimpleExperience ? "" : "lg:hidden"}`} aria-label={copy.mobileCustomerList}>
                  {customers.map((customer) => {
                    const { progress } = calculateRewardProgress(
                      customer.balance,
                      business.rewardThreshold,
                      customer.isActive
                    );

                    const customerSegment = getCustomerSegment({
                      isActive: customer.isActive,
                      createdAt: customer.createdAt,
                      lastActivityAt:
                        customer.transactions[0]?.createdAt ?? null,
                      lifetimeEarned: customer.lifetimeEarned,
                      rewardThreshold: business.rewardThreshold,
                    });

                    return (
                      <article
                        key={customer.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                      >
                        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h2
                                dir="auto"
                                className="text-lg font-bold text-slate-950"
                              >
                                {customer.firstName} {customer.lastName ?? ""}
                              </h2>

                              <span
                                className={
                                  customer.isActive
                                    ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                                    : "rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600"
                                }
                              >
                                {customer.isActive ? copy.active : copy.inactive}
                              </span>

                              <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
                                {getCustomerSegmentLabel(customerSegment, language)}
                              </span>

                              {customer.tagAssignments.map((assignment) => (
                                <span
                                  key={assignment.id}
                                  className="rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-semibold text-cyan-800"
                                >
                                  {assignment.tag.name}
                                </span>
                              ))}
                            </div>

                            <p dir="ltr" className="mt-1 text-sm text-slate-500">
                              {customer.phone}
                            </p>

                            <p dir="ltr" className="mt-1 text-xs font-semibold text-violet-600">
                              {copy.code}: {customer.customerCode}
                            </p>
                          </div>

                          <div className="sm:text-right">
                            <p className="text-2xl font-bold text-slate-950">
                              <span dir="ltr" className="lf-type-numeric">{customer.balance}</span>
                            </p>

                            <p dir="auto" className="text-sm text-slate-500">
                              {business.unitName}
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${progress}%`,
                              backgroundColor: theme.primaryColor,
                            }}
                          />
                        </div>

                        <p className="mt-2 text-xs text-slate-500">
                          <span dir="ltr" className="lf-type-numeric">{customer.balance} / {business.rewardThreshold}</span> {copy.toReachReward}
                        </p>

                        {progress === 100 ? <p className="mt-2 text-xs font-semibold text-emerald-800">{copy.rewardReadyToRedeem}</p> : null}
                        <p className="mt-2 text-xs text-slate-500">{customer.transactions[0] ? copy.lastActivityDate(customer.transactions[0].createdAt.toLocaleDateString(dateLocale)) : copy.noActivityYet}</p>

                        <Link
                          href={`/businesses/${business.slug}/customers/${customer.id}`}
                          className="mt-4 inline-flex w-full justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 sm:w-auto"
                        >
                          {copy.openCustomerProfile}
                        </Link>
                      </article>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <nav
                    aria-label={copy.customers}
                    className="mt-6 flex flex-wrap items-center justify-center gap-2"
                  >
                    {currentPage > 1 ? (
                      <Link
                        href={getPageUrl(currentPage - 1)}
                        className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 hover:border-violet-400"
                      >
                        {copy.previous}
                      </Link>
                    ) : (
                      <span className="cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 font-semibold text-slate-400">
                        {copy.previous}
                      </span>
                    )}

                    {paginationPages.map((pageNumber) => (
                      <Link
                        key={pageNumber}
                        href={getPageUrl(pageNumber)}
                        className={
                          pageNumber === currentPage
                            ? "rounded-xl bg-violet-600 px-4 py-2 font-semibold text-white"
                            : "rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 hover:border-violet-400"
                        }
                      >
                        {pageNumber}
                      </Link>
                    ))}

                    {currentPage < totalPages ? (
                      <Link
                        href={getPageUrl(currentPage + 1)}
                        className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 hover:border-violet-400"
                      >
                        {copy.next}
                      </Link>
                    ) : (
                      <span className="cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 font-semibold text-slate-400">
                        {copy.next}
                      </span>
                    )}
                  </nav>
                )}
              </>
            )}
          </section>
        </div>
      </ListPageTemplate>
    </main>
  );
}
