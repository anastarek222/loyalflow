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
    select: { language: true, role: true, experienceAccess: true },
  });

  const { slug } = await params;
  const query = await searchParams;
  const language = normalizeLanguage(authenticatedUser?.language);
  const copy = customerUiCopy(language);
  const dateLocale = getLanguageLocale(language);
  const experienceMode = resolveExperienceMode(
    (await cookies()).get(getExperienceModeCookieName(session.user.id))?.value,
    authenticatedUser?.role ?? session.user.role,
    authenticatedUser?.experienceAccess,
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
      className="min-h-full px-4 py-6 sm:px-6 sm:py-8"
      data-experience-mode={experienceMode}
      data-experience-customers={isSimpleExperience ? "simple" : "advanced"}
    >
      <ListPageTemplate
        container="wide"
        className="space-y-6"
        header={<PageHeader
          title={copy.customers}
          description={isSimpleExperience ? copy.simpleDescription : copy.advancedDescription(business.name)}
          status={<span className="rounded-full bg-surface-subtle px-2 py-0.5 text-xs font-semibold text-foreground-muted">{copy.customersCount(totalCustomers)}</span>}
          secondaryActions={<div className="flex flex-wrap items-center gap-2">
            <Link href={`/businesses/${business.slug}`} className="min-h-11 rounded-[var(--lf-radius-input)] px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-subtle">{copy.backToBusiness}</Link>
            {canReviewDuplicates ? <a href="#add-customer" className="inline-flex min-h-11 items-center rounded-[var(--lf-radius-input)] bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover">{copy.addCustomer}</a> : null}
            {canScanCustomers ? <Link href={`/businesses/${business.slug}/scan`} className="inline-flex min-h-11 items-center rounded-[var(--lf-radius-input)] border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground-muted hover:border-primary/30 hover:bg-surface-subtle">{copy.scan}</Link> : null}
            {canReviewDuplicates && (
              <Link
                href={`/businesses/${business.slug}/duplicates`}
                className={`min-h-11 rounded-[var(--lf-radius-input)] border border-warning/30 bg-warning-subtle px-4 py-2 text-sm font-semibold text-warning hover:bg-warning-subtle ${isSimpleExperience ? "hidden" : ""}`}
              >
                {copy.reviewDuplicates}
              </Link>
            )}
            {canExportData && (
              <a
              href={`/businesses/${business.slug}/customers/export`}
              className={`min-h-11 rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground-muted hover:border-success/30 hover:bg-success-subtle ${isSimpleExperience ? "hidden" : ""}`}
            >
              {copy.exportCustomers}
            </a>
            )}
          </div>}
        />}
      >

        {query.created === "1" && (
          <div className="mb-6 rounded-[var(--lf-radius-input)] border border-success/30 bg-success-subtle px-4 py-4 text-success">
            {copy.created}
          </div>
        )}

        {query.error === "invalid" && (
          <div className="mb-6 rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-4 text-danger">
            {copy.invalidCustomer}
          </div>
        )}

        {query.error === "phone" && (
          <div className="mb-6 rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-4 text-danger">
            {copy.invalidPhone}
          </div>
        )}

        {query.error === "duplicate" && (
          <div className="mb-6 rounded-[var(--lf-radius-input)] border border-warning/30 bg-warning-subtle px-4 py-4 text-warning">
            {copy.duplicatePhone}
          </div>
        )}

        {query.bulk && query.selected && query.changed && (
          <div className={`mb-6 rounded-[var(--lf-radius-input)] border px-4 py-4 ${query.bulk === "invalid" || query.bulk === "invalid-selection" ? "border-danger/30 bg-danger-subtle text-danger" : "border-success/30 bg-success-subtle text-success"}`}>
            {query.bulk === "invalid" || query.bulk === "invalid-selection"
              ? copy.bulkInvalid
              : copy.bulkComplete(query.selected, query.changed)}
          </div>
        )}

        {isSimpleExperience && canReviewDuplicates ? (
          <details id="add-customer" className="scroll-mt-6 rounded-[var(--lf-radius-card)] border border-border bg-surface">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-bold text-foreground">
              <span>{copy.addCustomer}</span>
              <span className="text-sm font-semibold text-primary">+</span>
            </summary>
            <div className="border-t border-border p-5">
              <p className="mb-4 text-sm text-foreground-subtle">{copy.customerCodeHint}</p>
              <form action={createCustomer} className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="simpleFirstName" className="mb-2 block text-sm font-medium text-foreground-muted">{copy.firstName}</label>
                  <input id="simpleFirstName" name="firstName" required minLength={2} maxLength={50} placeholder={copy.firstNamePlaceholder} dir="auto" className="w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-3 outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/20" />
                </div>
                <div>
                  <label htmlFor="simpleLastName" className="mb-2 block text-sm font-medium text-foreground-muted">{copy.lastName}</label>
                  <input id="simpleLastName" name="lastName" maxLength={50} placeholder={copy.lastNamePlaceholder} dir="auto" className="w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-3 outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/20" />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="simplePhone" className="mb-2 block text-sm font-medium text-foreground-muted">{copy.phone}</label>
                  <input id="simplePhone" name="phone" type="tel" required dir="ltr" placeholder="+201000000000" className="w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-3 outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/20" />
                </div>
                <button type="submit" className="min-h-11 rounded-[var(--lf-radius-input)] bg-primary px-5 font-semibold text-white hover:bg-primary-hover sm:col-span-2">{copy.addCustomer}</button>
              </form>
            </div>
          </details>
        ) : null}

        <div className={`grid gap-6 lg:gap-8 ${canReviewDuplicates && !isSimpleExperience ? "lg:grid-cols-[minmax(18rem,22rem)_1fr]" : ""}`}>
          {canReviewDuplicates && !isSimpleExperience ? <section id="add-customer" className="h-fit scroll-mt-6 rounded-[var(--lf-radius-card)] border border-border bg-surface p-5">
            <h2 className="text-xl font-bold text-foreground">{copy.addCustomer}</h2>

            <p className="mt-1 text-sm text-foreground-subtle">
              {copy.customerCodeHint}
            </p>

            <form action={createCustomer} className="mt-6 space-y-6">
              <div>
                <label
                  htmlFor="firstName"
                  className="mb-2 block text-sm font-medium text-foreground-muted"
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
                  className="w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-4 outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/20"
                />
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="mb-2 block text-sm font-medium text-foreground-muted"
                >
                  {copy.lastName}
                </label>

                <input
                  id="lastName"
                  name="lastName"
                  maxLength={50}
                  placeholder={copy.lastNamePlaceholder}
                  dir="auto"
                  className="w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-4 outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/20"
                />
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="mb-2 block text-sm font-medium text-foreground-muted"
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
                  className="w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-4 outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/20"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-[var(--lf-radius-input)] bg-foreground px-6 py-4 font-semibold text-white transition hover:bg-primary-subtle"
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
            <form className={`mb-5 rounded-[var(--lf-radius-card)] border border-border bg-surface ${isSimpleExperience ? "p-4" : "p-4 sm:p-5"}`}>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_150px_150px_150px_190px_auto]">
                <div>
                  <label
                    htmlFor="q"
                    className="mb-2 block text-sm font-medium text-foreground-muted"
                  >
                    {copy.search}
                  </label>

                  <input
                    id="q"
                    name="q"
                    defaultValue={search}
                    placeholder={copy.searchPlaceholder}
                    className="w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4 outline-none focus:border-primary/30"
                  />
                </div>

                <div className={isSimpleExperience ? "hidden" : undefined}>
                  <label
                    htmlFor="tag"
                    className="mb-2 block text-sm font-medium text-foreground-muted"
                  >
                    {copy.tag}
                  </label>

                  <select
                    id="tag"
                    name="tag"
                    defaultValue={selectedTagId ?? ""}
                    className="w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4 outline-none focus:border-primary/30"
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
                    className="mb-2 block text-sm font-medium text-foreground-muted"
                  >
                    {copy.status}
                  </label>

                  <select
                    id="status"
                    name="status"
                    defaultValue={status}
                    className="w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4 outline-none focus:border-primary/30"
                  >
                    <option value="all">{copy.allCustomers}</option>

                    <option value="active">{copy.active}</option>

                    <option value="inactive">{copy.inactive}</option>
                  </select>
                </div>

                <div className={isSimpleExperience ? "hidden" : undefined}>
                  <label
                    htmlFor="segment"
                    className="mb-2 block text-sm font-medium text-foreground-muted"
                  >
                    {copy.segment}
                  </label>

                  <select
                    id="segment"
                    name="segment"
                    defaultValue={segment ?? ""}
                    className="w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4 outline-none focus:border-primary/30"
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
                    className="mb-2 block text-sm font-medium text-foreground-muted"
                  >
                    {copy.sort}
                  </label>

                  <select
                    id="sort"
                    name="sort"
                    defaultValue={sort}
                    className="w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4 outline-none focus:border-primary/30"
                  >
                    <option value="newest">{copy.newest}</option>

                    <option value="oldest">{copy.oldest}</option>

                    <option value="balance_high">{copy.balanceHigh}</option>

                    <option value="balance_low">{copy.balanceLow}</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full self-end rounded-[var(--lf-radius-input)] bg-primary px-6 py-4 font-semibold text-[var(--lf-primary-foreground)] transition hover:bg-primary-subtle"
                >
                  {copy.apply}
                </button>
              </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm text-foreground-subtle">
                  {copy.results(firstResult, lastResult, filteredCustomers)}
                </p>

                {filtersActive && (
                  <Link
                    href={`/businesses/${business.slug}/customers`}
                    className="text-sm font-semibold text-primary hover:text-primary"
                  >
                    {copy.resetFilters}
                  </Link>
                )}
              </div>
              {filtersActive ? <div aria-label={copy.activeFilters} className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-foreground-muted">
                {search ? <span className="rounded-full bg-surface-subtle px-4 py-1">{copy.searchFilter}: {search}</span> : null}
                {status !== "all" ? <span className="rounded-full bg-surface-subtle px-4 py-1">{status === "active" ? copy.active : copy.inactive}</span> : null}
                {segment ? <span className="rounded-full bg-surface-subtle px-4 py-1">{copy.segmentFilter}: {getCustomerSegmentLabel(segment, language)}</span> : null}
                {selectedTagId ? <span className="rounded-full bg-surface-subtle px-4 py-1">{copy.tagFilter}: {businessTags.find((tag) => tag.id === selectedTagId)?.name}</span> : null}
              </div> : null}
              {isSimpleExperience ? <details className="mt-4 rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle px-4 py-2 text-sm">
                <summary className="cursor-pointer font-semibold text-foreground-muted">{copy.advancedOptions}</summary>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/businesses/${business.slug}/customers?segment=REWARD_READY`} className="rounded-[var(--lf-radius-input)] border border-border bg-surface px-4 py-2 font-semibold text-primary">{copy.rewardReady}</Link>
                  <Link href={`/businesses/${business.slug}/customers?segment=AT_RISK`} className="rounded-[var(--lf-radius-input)] border border-border bg-surface px-4 py-2 font-semibold text-primary">{copy.atRisk}</Link>
                  <Link href={`/businesses/${business.slug}/customers?status=inactive`} className="rounded-[var(--lf-radius-input)] border border-border bg-surface px-4 py-2 font-semibold text-primary">{copy.suspendedAccounts}</Link>
                </div>
              </details> : null}
            </form>

            {customers.length === 0 ? (
              <div className="rounded-[var(--lf-radius-card)] border border-dashed border-border bg-white p-12 text-center">
                <h2 className="text-xl font-semibold text-foreground">
                  {totalCustomers === 0 ? copy.noCustomers : copy.noResults}
                </h2>

                <p className="mt-2 text-foreground-subtle">
                  {totalCustomers === 0 ? copy.noCustomersDescription : copy.noResultsDescription}
                </p>

                {totalCustomers === 0 && canReviewDuplicates ? (
                  <a href="#add-customer" className="mt-6 inline-flex rounded-[var(--lf-radius-input)] bg-foreground px-6 py-4 font-semibold text-white">{copy.addCustomer}</a>
                ) : null}
                {filtersActive && (
                  <Link
                    href={`/businesses/${business.slug}/customers`}
                    className="mt-6 inline-flex rounded-[var(--lf-radius-input)] bg-foreground px-6 py-4 font-semibold text-white"
                  >
                    {copy.showAllCustomers}
                  </Link>
                )}
              </div>
            ) : (
              <>
                {!isSimpleExperience ? (
                  <div className="hidden overflow-hidden rounded-[var(--lf-radius-input)] border border-border bg-surface shadow-sm lg:block">
                    <table className="w-full text-start">
                      <caption className="sr-only">{copy.customerList}</caption>
                      <thead className="border-b border-border bg-surface-subtle text-xs font-semibold text-foreground-muted">
                        <tr>
                          <th scope="col" className="px-6 py-4 text-start">{copy.customer}</th>
                          <th scope="col" className="px-6 py-4 text-start">{copy.contact}</th>
                          <th scope="col" className="px-6 py-4 text-start">{copy.loyalty}</th>
                          <th scope="col" className="px-6 py-4 text-start">{copy.status}</th>
                          <th scope="col" className="px-6 py-4 text-start">{copy.lastActivity}</th>
                          <th scope="col" className="px-6 py-4 text-end"><span className="sr-only">{copy.action}</span></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {customers.map((customer) => {
                          const { progress, rewardAvailable } = calculateRewardProgress(customer.balance, business.rewardThreshold, customer.isActive);
                          const customerSegment = getCustomerSegment({ isActive: customer.isActive, createdAt: customer.createdAt, lastActivityAt: customer.transactions[0]?.createdAt ?? null, lifetimeEarned: customer.lifetimeEarned, rewardThreshold: business.rewardThreshold });
                          return <tr key={customer.id} className="hover:bg-surface-subtle">
                            <td className="px-6 py-4"><Link href={`/businesses/${business.slug}/customers/${customer.id}`} className="font-semibold text-foreground hover:text-primary" dir="auto">{customer.firstName} {customer.lastName ?? ""}</Link><p dir="ltr" className="mt-1 text-xs text-foreground-subtle">{customer.customerCode}</p></td>
                            <td className="px-6 py-4 text-sm text-foreground-muted"><span dir="ltr">{customer.phone}</span></td>
                            <td className="px-6 py-4"><p className="font-semibold text-foreground"><span dir="ltr" className="lf-type-numeric">{customer.balance}</span> <span dir="auto" className="text-sm font-normal text-foreground-muted">{business.unitName}</span></p><div className="mt-2 h-1.5 w-28 overflow-hidden rounded-full bg-surface-subtle" aria-label={copy.progress(progress)}><div className="h-full bg-primary" style={{ width: `${progress}%` }} /></div></td>
                            <td className="px-6 py-4"><div className="flex flex-wrap gap-1"><span className="rounded-full bg-surface-subtle px-2 py-1 text-xs font-semibold text-foreground-muted">{getCustomerSegmentLabel(customerSegment, language)}</span>{rewardAvailable ? <span className="rounded-full bg-success-subtle px-2 py-1 text-xs font-semibold text-success">{copy.rewardReady}</span> : null}</div></td>
                            <td className="px-6 py-4 text-sm text-foreground-muted">{customer.transactions[0] ? customer.transactions[0].createdAt.toLocaleDateString(dateLocale) : copy.noActivity}</td>
                            <td className="px-6 py-4 text-end"><Link href={`/businesses/${business.slug}/customers/${customer.id}`} className="inline-flex min-h-10 items-center rounded-[var(--lf-radius-input)] px-4 text-sm font-semibold text-primary hover:bg-primary-subtle">{copy.openProfile}</Link></td>
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
                        className="rounded-[var(--lf-radius-card)] border border-border bg-surface p-4 transition hover:border-primary/25 sm:p-5"
                      >
                        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h2
                                dir="auto"
                                className="text-lg font-bold text-foreground"
                              >
                                {customer.firstName} {customer.lastName ?? ""}
                              </h2>

                              <span
                                className={
                                  customer.isActive
                                    ? "rounded-full bg-success-subtle px-2.5 py-1 text-xs font-semibold text-success"
                                    : "rounded-full bg-surface-subtle px-2.5 py-1 text-xs font-semibold text-foreground-muted"
                                }
                              >
                                {customer.isActive ? copy.active : copy.inactive}
                              </span>

                              <span className="rounded-full bg-primary-subtle px-2.5 py-1 text-xs font-semibold text-primary">
                                {getCustomerSegmentLabel(customerSegment, language)}
                              </span>

                              {customer.tagAssignments.map((assignment) => (
                                <span
                                  key={assignment.id}
                                  className="rounded-full bg-info-subtle px-2.5 py-1 text-xs font-semibold text-info"
                                >
                                  {assignment.tag.name}
                                </span>
                              ))}
                            </div>

                            <p dir="ltr" className="mt-1 text-sm text-foreground-subtle">
                              {customer.phone}
                            </p>

                            <p dir="ltr" className="mt-1 text-xs font-semibold text-primary">
                              {copy.code}: {customer.customerCode}
                            </p>
                          </div>

                          <div className="sm:text-right">
                            <p className="text-2xl font-bold text-foreground">
                              <span dir="ltr" className="lf-type-numeric">{customer.balance}</span>
                            </p>

                            <p dir="auto" className="text-sm text-foreground-subtle">
                              {business.unitName}
                            </p>
                          </div>
                        </div>

                        <div className="mt-6 h-2 overflow-hidden rounded-full bg-surface-subtle">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${progress}%`,
                              backgroundColor: "var(--lf-primary)",
                            }}
                          />
                        </div>

                        <p className="mt-2 text-xs text-foreground-subtle">
                          <span dir="ltr" className="lf-type-numeric">{customer.balance} / {business.rewardThreshold}</span> {copy.toReachReward}
                        </p>

                        {progress === 100 ? <p className="mt-2 text-xs font-semibold text-success">{copy.rewardReadyToRedeem}</p> : null}
                        <p className="mt-2 text-xs text-foreground-subtle">{customer.transactions[0] ? copy.lastActivityDate(customer.transactions[0].createdAt.toLocaleDateString(dateLocale)) : copy.noActivityYet}</p>

                        <Link
                          href={`/businesses/${business.slug}/customers/${customer.id}`}
                          className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle px-5 text-sm font-semibold text-foreground transition hover:border-primary/30 hover:text-primary sm:w-auto"
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
                        className="rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-2 font-semibold text-foreground-muted hover:border-primary/30"
                      >
                        {copy.previous}
                      </Link>
                    ) : (
                      <span className="cursor-not-allowed rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle px-4 py-2 font-semibold text-foreground-subtle">
                        {copy.previous}
                      </span>
                    )}

                    {paginationPages.map((pageNumber) => (
                      <Link
                        key={pageNumber}
                        href={getPageUrl(pageNumber)}
                        className={
                          pageNumber === currentPage
                            ? "rounded-[var(--lf-radius-input)] bg-primary px-4 py-2 font-semibold text-[var(--lf-primary-foreground)]"
                            : "rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-2 font-semibold text-foreground-muted hover:border-primary/30"
                        }
                      >
                        {pageNumber}
                      </Link>
                    ))}

                    {currentPage < totalPages ? (
                      <Link
                        href={getPageUrl(currentPage + 1)}
                        className="rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-2 font-semibold text-foreground-muted hover:border-primary/30"
                      >
                        {copy.next}
                      </Link>
                    ) : (
                      <span className="cursor-not-allowed rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle px-4 py-2 font-semibold text-foreground-subtle">
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
