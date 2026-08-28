import { getAuthenticatedRequestContext } from "@/lib/auth/authenticated-request-context";
import {
  getCustomerFilterSegments,
  getCustomerSegment,
  getCustomerSegmentLabel,
  getCustomerSegmentWhere,
  type CustomerSegment,
} from "@/lib/customers/segments";
import { getRewardAvailability } from "@/lib/rewards/availability";
import { formatLoyaltyAmount } from "@/lib/loyalty/presentation";
import { getCustomerTagWhere } from "@/lib/customers/notes-tags";
import {
  canUseCustomerBulkOperations,
  canUseCustomerCampaigns,
  canViewCustomerNotesTags,
} from "@/lib/customers/feature-access";
import {
  canAccessBusiness,
  canExportBusinessData,
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
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  Download,
  ScanLine,
  Search,
  SlidersHorizontal,
  UserPlus,
  UsersRound,
} from "lucide-react";

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
    add?: string;
    page?: string;
  }>;
};

export default async function CustomersPage({
  params,
  searchParams,
}: CustomersPageProps) {
  const requestContext = await getAuthenticatedRequestContext();

  if (!requestContext) {
    redirect("/login");
  }

  const { session, user: authenticatedUser } = requestContext;

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

  const canViewNotesTags = canViewCustomerNotesTags(
    session.user,
    business.id,
    business.plan,
  );
  const canUseBulkOperations = canUseCustomerBulkOperations(
    session.user,
    business.id,
    business.plan,
  );
  const canUseCampaigns = canUseCustomerCampaigns(
    session.user,
    business.id,
    business.plan,
  );

  const activeRewards = await prisma.reward.findMany({
    where: { businessId: business.id, isActive: true },
    select: { id: true, name: true, cost: true, isActive: true },
  });
  const availabilityInput = {
    rewardThreshold: business.rewardThreshold,
    fallbackReward: {
      name: business.rewardName,
      cost: business.rewardThreshold,
    },
    catalogueRewards: activeRewards,
  };
  const canonicalTargetCost = getRewardAvailability({
    ...availabilityInput,
    customerActive: true,
    balance: 0,
  }).targetCost;

  const search = query.q?.trim() ?? "";

  const businessTags = canViewNotesTags
    ? await prisma.customerTag.findMany({
        where: { businessId: business.id },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
    : [];
  const selectedTagId = businessTags.some((tag) => tag.id === query.tag)
    ? query.tag!
    : null;

  const status =
    query.status === "active" || query.status === "inactive"
      ? query.status
      : "all";

  const availableSegments = getCustomerFilterSegments(business.loyaltyMode);

  const segment = availableSegments.includes(query.segment as CustomerSegment)
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
    const nameParts = search.split(/\s+/).filter(Boolean);

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

  if (segment === "REWARD_READY") {
    customerFilters.push({
      isActive: true,
      balance: { gte: canonicalTargetCost },
    });
  } else if (segment) {
    customerFilters.push(
      getCustomerSegmentWhere(
        segment,
        business.rewardThreshold,
        undefined,
        business.earnAmount,
      ),
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
  const showAddCustomer =
    query.add === "1" ||
    ["invalid", "phone", "duplicate", "subscription-restricted"].includes(
      query.error ?? "",
    );

  const canExportData = canExportBusinessData(
    session.user,
    business.id,
    business.allowOwnerDataExport,
  );
  const canReviewDuplicates = canPerform(
    session.user,
    business.id,
    "CUSTOMERS_EDIT",
  );
  const canScanCustomers = canPerform(
    session.user,
    business.id,
    "LOYALTY_EARN",
  );
  const bulkAction = bulkCustomerAction.bind(null, business.slug);

  return (
    <main
      className="min-h-full bg-[radial-gradient(circle_at_top,var(--lf-primary-soft),transparent_38rem)] px-4 py-6 sm:px-6 sm:py-10"
      data-experience-mode={experienceMode}
      data-experience-customers={isSimpleExperience ? "simple" : "advanced"}
    >
      <ListPageTemplate
        container="wide"
        className="space-y-6"
        header={
          <PageHeader
            eyebrow={business.name}
            title={copy.customers}
            description={
              isSimpleExperience
                ? copy.simpleDescription
                : copy.advancedDescription(business.name)
            }
            status={
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/10 bg-primary-subtle px-2.5 py-1 text-xs font-semibold text-primary">
                <UsersRound className="size-3.5" aria-hidden="true" />
                {copy.customersCount(totalCustomers)}
              </span>
            }
            secondaryActions={
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/businesses/${business.slug}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-[var(--lf-radius-input)] px-4 py-2 text-sm font-semibold text-foreground-muted hover:bg-surface-subtle"
                >
                  <ArrowLeft
                    className="size-4 rtl:rotate-180"
                    aria-hidden="true"
                  />
                  {copy.backToBusiness}
                </Link>
                {canReviewDuplicates ? (
                  <a
                    href={`/businesses/${business.slug}/customers?add=1#add-customer`}
                    className="inline-flex min-h-11 items-center gap-2 rounded-[var(--lf-radius-input)] bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover"
                  >
                    <UserPlus className="size-4" aria-hidden="true" />
                    {copy.addCustomer}
                  </a>
                ) : null}
                {canScanCustomers ? (
                  <Link
                    href={`/businesses/${business.slug}/scan`}
                    className="inline-flex min-h-11 items-center gap-2 rounded-[var(--lf-radius-input)] border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground-muted shadow-sm hover:border-primary/30 hover:text-primary"
                  >
                    <ScanLine className="size-4" aria-hidden="true" />
                    {copy.scan}
                  </Link>
                ) : null}
                {canReviewDuplicates && (
                  <Link
                    href={`/businesses/${business.slug}/duplicates`}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-[var(--lf-radius-input)] border border-warning/30 bg-warning-subtle px-4 py-2 text-sm font-semibold text-warning hover:bg-warning-subtle ${isSimpleExperience ? "hidden" : ""}`}
                  >
                    <AlertTriangle className="size-4" aria-hidden="true" />
                    {copy.reviewDuplicates}
                  </Link>
                )}
                {canExportData && (
                  <a
                    href={`/businesses/${business.slug}/customers/export`}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground-muted shadow-sm hover:border-success/30 hover:bg-success-subtle ${isSimpleExperience ? "hidden" : ""}`}
                  >
                    <Download className="size-4" aria-hidden="true" />
                    {copy.exportCustomers}
                  </a>
                )}
              </div>
            }
          />
        }
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

        {query.error === "subscription-restricted" && (
          <div className="mb-6 rounded-[var(--lf-radius-input)] border border-warning/30 bg-warning-subtle px-4 py-4 text-warning">
            {copy.subscriptionRestricted}
          </div>
        )}

        {query.bulk && query.selected && query.changed && (
          <div
            className={`mb-6 rounded-[var(--lf-radius-input)] border px-4 py-4 ${query.bulk === "invalid" || query.bulk === "invalid-selection" ? "border-danger/30 bg-danger-subtle text-danger" : "border-success/30 bg-success-subtle text-success"}`}
          >
            {query.bulk === "invalid" || query.bulk === "invalid-selection"
              ? copy.bulkInvalid
              : copy.bulkComplete(query.selected, query.changed)}
          </div>
        )}

        {isSimpleExperience && canReviewDuplicates ? (
          <details
            id="add-customer"
            open={showAddCustomer}
            className="group scroll-mt-6 overflow-hidden rounded-[var(--lf-radius-card)] border border-primary/15 bg-surface shadow-sm"
          >
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-bold text-foreground">
              <span className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary-subtle text-primary">
                  <UserPlus className="size-4" aria-hidden="true" />
                </span>
                {copy.addCustomer}
              </span>
              <ChevronDown
                className="size-5 shrink-0 text-primary transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <div className="border-t border-border p-5">
              <p className="mb-4 text-sm text-foreground-subtle">
                {copy.customerCodeHint}
              </p>
              <form
                action={createCustomer}
                className="grid gap-4 sm:grid-cols-2"
              >
                <div>
                  <label
                    htmlFor="simpleFirstName"
                    className="mb-2 block text-sm font-medium text-foreground-muted"
                  >
                    {copy.firstName}
                  </label>
                  <input
                    id="simpleFirstName"
                    name="firstName"
                    required
                    minLength={2}
                    maxLength={50}
                    placeholder={copy.firstNamePlaceholder}
                    dir="auto"
                    className="w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-3 outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label
                    htmlFor="simpleLastName"
                    className="mb-2 block text-sm font-medium text-foreground-muted"
                  >
                    {copy.lastName}
                  </label>
                  <input
                    id="simpleLastName"
                    name="lastName"
                    maxLength={50}
                    placeholder={copy.lastNamePlaceholder}
                    dir="auto"
                    className="w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-3 outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/20"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor="simplePhone"
                    className="mb-2 block text-sm font-medium text-foreground-muted"
                  >
                    {copy.phone}
                  </label>
                  <input
                    id="simplePhone"
                    name="phone"
                    type="tel"
                    required
                    dir="ltr"
                    placeholder="+201000000000"
                    className="w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-3 outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/20"
                  />
                </div>
                <button
                  type="submit"
                  className="min-h-11 rounded-[var(--lf-radius-input)] bg-primary px-5 font-semibold text-white hover:bg-primary-hover sm:col-span-2"
                >
                  {copy.addCustomer}
                </button>
              </form>
            </div>
          </details>
        ) : null}

        <div
          className={`grid gap-6 lg:gap-8 ${canReviewDuplicates && !isSimpleExperience ? "lg:grid-cols-[minmax(18rem,22rem)_1fr]" : ""}`}
        >
          {canReviewDuplicates && !isSimpleExperience ? (
            <details
              id="add-customer"
              open={showAddCustomer}
              className="group h-fit scroll-mt-6 overflow-hidden rounded-[var(--lf-radius-card)] border border-primary/15 bg-gradient-to-b from-primary-subtle/50 to-surface shadow-sm lg:sticky lg:top-6"
            >
              <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-5 py-4 marker:content-none">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
                  <UserPlus className="size-5" aria-hidden="true" />
                </span>
                <h2 className="font-bold text-foreground">
                  {copy.addCustomer}
                </h2>
                <ChevronDown
                  className="ms-auto size-5 shrink-0 text-primary transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <div className="border-t border-primary/10 p-5">
                <p className="text-sm text-foreground-subtle">
                  {copy.customerCodeHint}
                </p>

                <form action={createCustomer} className="mt-5 space-y-5">
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
                    className="w-full rounded-[var(--lf-radius-input)] bg-primary px-6 py-4 font-semibold text-white shadow-sm transition hover:bg-primary-hover"
                  >
                    {copy.addCustomer}
                  </button>
                </form>
              </div>
            </details>
          ) : null}

          <section>
            {!isSimpleExperience && canUseBulkOperations ? (
              <BulkCustomerOperations
                customers={customers.map((customer) => ({
                  id: customer.id,
                  name: [customer.firstName, customer.lastName]
                    .filter(Boolean)
                    .join(" "),
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
            <form
              className={`mb-5 rounded-[var(--lf-radius-card)] border border-border bg-surface/95 shadow-sm ${isSimpleExperience ? "p-4" : "p-4 sm:p-5"}`}
            >
              <div className="mb-4 flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary-subtle text-primary">
                  {isSimpleExperience ? (
                    <Search className="size-4" aria-hidden="true" />
                  ) : (
                    <SlidersHorizontal className="size-4" aria-hidden="true" />
                  )}
                </span>
                <div>
                  <h2 className="font-bold text-foreground">{copy.search}</h2>
                  <p className="text-xs text-foreground-subtle">
                    {copy.results(firstResult, lastResult, filteredCustomers)}
                  </p>
                </div>
              </div>
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

                {!isSimpleExperience && canViewNotesTags ? (
                  <div>
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
                ) : null}

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
                  className="w-full self-end rounded-[var(--lf-radius-input)] bg-primary px-6 py-4 font-semibold text-[var(--lf-primary-foreground)] shadow-sm transition hover:bg-primary-hover"
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
              {filtersActive ? (
                <div
                  aria-label={copy.activeFilters}
                  className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-foreground-muted"
                >
                  {search ? (
                    <span className="rounded-full bg-surface-subtle px-4 py-1">
                      {copy.searchFilter}: {search}
                    </span>
                  ) : null}
                  {status !== "all" ? (
                    <span className="rounded-full bg-surface-subtle px-4 py-1">
                      {status === "active" ? copy.active : copy.inactive}
                    </span>
                  ) : null}
                  {segment ? (
                    <span className="rounded-full bg-surface-subtle px-4 py-1">
                      {copy.segmentFilter}:{" "}
                      {getCustomerSegmentLabel(segment, language)}
                    </span>
                  ) : null}
                  {selectedTagId ? (
                    <span className="rounded-full bg-surface-subtle px-4 py-1">
                      {copy.tagFilter}:{" "}
                      {
                        businessTags.find((tag) => tag.id === selectedTagId)
                          ?.name
                      }
                    </span>
                  ) : null}
                </div>
              ) : null}
              {isSimpleExperience ? (
                <details className="mt-4 rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle px-4 py-2 text-sm">
                  <summary className="cursor-pointer font-semibold text-foreground-muted">
                    {copy.advancedOptions}
                  </summary>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link
                      href={`/businesses/${business.slug}/customers?segment=REWARD_READY`}
                      className="rounded-[var(--lf-radius-input)] border border-border bg-surface px-4 py-2 font-semibold text-primary"
                    >
                      {copy.rewardReady}
                    </Link>
                    <Link
                      href={`/businesses/${business.slug}/customers?segment=AT_RISK`}
                      className="rounded-[var(--lf-radius-input)] border border-border bg-surface px-4 py-2 font-semibold text-primary"
                    >
                      {copy.atRisk}
                    </Link>
                    <Link
                      href={`/businesses/${business.slug}/customers?status=inactive`}
                      className="rounded-[var(--lf-radius-input)] border border-border bg-surface px-4 py-2 font-semibold text-primary"
                    >
                      {copy.suspendedAccounts}
                    </Link>
                  </div>
                </details>
              ) : null}
            </form>

            {customers.length === 0 ? (
              <div className="rounded-[var(--lf-radius-card)] border border-dashed border-border bg-white p-12 text-center">
                <h2 className="text-xl font-semibold text-foreground">
                  {totalCustomers === 0 ? copy.noCustomers : copy.noResults}
                </h2>

                <p className="mt-2 text-foreground-subtle">
                  {totalCustomers === 0
                    ? copy.noCustomersDescription
                    : copy.noResultsDescription}
                </p>

                {totalCustomers === 0 && canReviewDuplicates ? (
                  <a
                    href="#add-customer"
                    className="mt-6 inline-flex rounded-[var(--lf-radius-input)] bg-foreground px-6 py-4 font-semibold text-white"
                  >
                    {copy.addCustomer}
                  </a>
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
                  <div className="hidden overflow-hidden rounded-[var(--lf-radius-card)] border border-border bg-surface shadow-sm lg:block">
                    <table className="w-full text-start">
                      <caption className="sr-only">{copy.customerList}</caption>
                      <thead className="border-b border-border bg-surface-subtle text-xs font-semibold text-foreground-muted">
                        <tr>
                          <th scope="col" className="px-6 py-4 text-start">
                            {copy.customer}
                          </th>
                          <th scope="col" className="px-6 py-4 text-start">
                            {copy.contact}
                          </th>
                          <th scope="col" className="px-6 py-4 text-start">
                            {copy.loyalty}
                          </th>
                          <th scope="col" className="px-6 py-4 text-start">
                            {copy.status}
                          </th>
                          <th scope="col" className="px-6 py-4 text-start">
                            {copy.lastActivity}
                          </th>
                          <th scope="col" className="px-6 py-4 text-end">
                            <span className="sr-only">{copy.action}</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {customers.map((customer) => {
                          const availability = getRewardAvailability({
                            ...availabilityInput,
                            customerActive: customer.isActive,
                            balance: customer.balance,
                          });
                          const { progress, rewardReady: rewardAvailable } =
                            availability;
                          const customerSegment = getCustomerSegment({
                            isActive: customer.isActive,
                            createdAt: customer.createdAt,
                            lastActivityAt:
                              customer.transactions[0]?.createdAt ?? null,
                            lifetimeEarned: customer.lifetimeEarned,
                            rewardThreshold: business.rewardThreshold,
                          });
                          return (
                            <tr
                              key={customer.id}
                              className="transition hover:bg-primary-subtle/35"
                            >
                              <td className="px-6 py-4">
                                <Link
                                  href={`/businesses/${business.slug}/customers/${customer.id}`}
                                  className="font-semibold text-foreground hover:text-primary"
                                  dir="auto"
                                >
                                  {customer.firstName} {customer.lastName ?? ""}
                                </Link>
                                <p
                                  dir="ltr"
                                  className="mt-1 text-xs text-foreground-subtle"
                                >
                                  {customer.customerCode}
                                </p>
                              </td>
                              <td className="px-6 py-4 text-sm text-foreground-muted">
                                <span dir="ltr">{customer.phone}</span>
                              </td>
                              <td className="px-6 py-4">
                                <p
                                  dir={
                                    business.loyaltyMode === "SALES_AMOUNT"
                                      ? "ltr"
                                      : "auto"
                                  }
                                  className="font-semibold text-foreground"
                                >
                                  {formatLoyaltyAmount({
                                    loyaltyMode: business.loyaltyMode,
                                    language,
                                    unitName: business.unitName,
                                    currency: business.currency,
                                    amount: customer.balance,
                                  })}
                                </p>
                                <div
                                  className="mt-2 h-1.5 w-28 overflow-hidden rounded-full bg-surface-subtle"
                                  aria-label={copy.progress(progress)}
                                >
                                  <div
                                    className="h-full bg-primary"
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-wrap gap-1">
                                  <span className="rounded-full bg-surface-subtle px-2 py-1 text-xs font-semibold text-foreground-muted">
                                    {getCustomerSegmentLabel(
                                      customerSegment,
                                      language,
                                    )}
                                  </span>
                                  {rewardAvailable ? (
                                    <span className="rounded-full bg-success-subtle px-2 py-1 text-xs font-semibold text-success">
                                      {copy.rewardReady}
                                    </span>
                                  ) : null}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-foreground-muted">
                                {customer.transactions[0]
                                  ? customer.transactions[0].createdAt.toLocaleDateString(
                                      dateLocale,
                                    )
                                  : copy.noActivity}
                              </td>
                              <td className="px-6 py-4 text-end">
                                <Link
                                  href={`/businesses/${business.slug}/customers/${customer.id}`}
                                  className="inline-flex min-h-10 items-center rounded-[var(--lf-radius-input)] px-4 text-sm font-semibold text-primary hover:bg-primary-subtle"
                                >
                                  {copy.openProfile}
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : null}
                <div
                  className={`space-y-4 ${isSimpleExperience ? "" : "lg:hidden"}`}
                  aria-label={copy.mobileCustomerList}
                >
                  {customers.map((customer) => {
                    const availability = getRewardAvailability({
                      ...availabilityInput,
                      customerActive: customer.isActive,
                      balance: customer.balance,
                    });
                    const { progress } = availability;

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
                        className="rounded-[var(--lf-radius-card)] border border-border bg-surface p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md sm:p-5"
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
                                {customer.isActive
                                  ? copy.active
                                  : copy.inactive}
                              </span>

                              <span className="rounded-full bg-primary-subtle px-2.5 py-1 text-xs font-semibold text-primary">
                                {getCustomerSegmentLabel(
                                  customerSegment,
                                  language,
                                )}
                              </span>

                              {canViewNotesTags
                                ? customer.tagAssignments.map((assignment) => (
                                    <span
                                      key={assignment.id}
                                      className="rounded-full bg-info-subtle px-2.5 py-1 text-xs font-semibold text-info"
                                    >
                                      {assignment.tag.name}
                                    </span>
                                  ))
                                : null}
                            </div>

                            <p
                              dir="ltr"
                              className="mt-1 text-sm text-foreground-subtle"
                            >
                              {customer.phone}
                            </p>

                            <p
                              dir="ltr"
                              className="mt-1 text-xs font-semibold text-primary"
                            >
                              {copy.code}: {customer.customerCode}
                            </p>
                          </div>

                          <div className="sm:text-right">
                            <p className="text-2xl font-bold text-foreground">
                              <span
                                dir={
                                  business.loyaltyMode === "SALES_AMOUNT"
                                    ? "ltr"
                                    : "auto"
                                }
                                className="lf-type-numeric"
                              >
                                {formatLoyaltyAmount({
                                  loyaltyMode: business.loyaltyMode,
                                  language,
                                  unitName: business.unitName,
                                  currency: business.currency,
                                  amount: customer.balance,
                                })}
                              </span>
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
                          <span dir="ltr" className="lf-type-numeric">
                            {customer.balance} / {availability.targetCost}
                          </span>{" "}
                          {copy.toReachReward}
                        </p>

                        {availability.rewardReady ? (
                          <p className="mt-2 text-xs font-semibold text-success">
                            {copy.rewardReadyToRedeem}
                          </p>
                        ) : null}
                        <p className="mt-2 text-xs text-foreground-subtle">
                          {customer.transactions[0]
                            ? copy.lastActivityDate(
                                customer.transactions[0].createdAt.toLocaleDateString(
                                  dateLocale,
                                ),
                              )
                            : copy.noActivityYet}
                        </p>

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
