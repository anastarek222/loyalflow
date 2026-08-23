/* eslint-disable @next/next/no-img-element */

import { randomUUID } from "node:crypto";

import { auth } from "@/auth";
import { getRequestBaseUrl } from "@/lib/app-url";
import { getCampaignSuggestion } from "@/lib/campaigns/suggestions";
import { calculateRewardProgress } from "@/lib/loyalty/progress";
import {
  formatLoyaltyAmount,
  operationalUnitLabel,
} from "@/lib/loyalty/presentation";
import { canAccessBusiness, canPerform } from "@/lib/permissions";
import {
  canManageCustomerNotesTags,
  canUseCustomerReferrals,
  canViewCustomerNotesTags,
} from "@/lib/customers/feature-access";
import { getAvailableRewardOptions } from "@/lib/rewards/catalog";
import { getRewardAvailability } from "@/lib/rewards/availability";
import { getRewardUnlockLifecycleState } from "@/lib/rewards/expiration";
import { buildCustomerTimeline } from "@/lib/customers/timeline";
import { publicCustomCardArtworkUrl } from "@/lib/cards/custom-card-storage";
import { getCustomerExperienceTheme } from "@/lib/theme";
import CopyLinkButton from "@/components/copy-link-button";
import ActivityTimeline from "@/components/customer-profile/activity-timeline";
import { LoyaltyCardPreview } from "@/components/loyalty-card-preview";
import RedeemRewardDialog from "@/components/redeem-reward-dialog";
import LoyaltySubmitButton from "@/components/loyalty-submit-button";
import LoyaltyOperationContextFields from "@/components/loyalty-operation-context-fields";
import { getOperationContextOptions } from "@/lib/loyalty/operation-context";
import {
  getExperienceModeCookieName,
  resolveExperienceMode,
} from "@/lib/experience-mode";
import prisma from "@/lib/prisma";
import { getLanguageLocale, normalizeLanguage } from "@/lib/i18n";
import { customerUiCopy, getLoyaltyModeLabel } from "@/lib/customers/ui-copy";
import {
  buildWhatsAppUrl,
  DEFAULT_WHATSAPP_TEMPLATES,
  renderWhatsAppTemplate,
} from "@/lib/whatsapp-templates";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import * as QRCode from "qrcode";

import {
  addLoyaltyAction,
  assignCustomerTagAction,
  createAndAssignCustomerTagAction,
  adjustCustomerBalanceAction,
  createCustomerReferralCodeAction,
  redeemRewardAction,
  removeCustomerTagAction,
  setCustomerStatusAction,
  updateCustomerAction,
} from "./actions";
import {
  createCustomerNoteCommandAction,
  updateCustomerNoteCommandAction,
} from "./note-actions";

type CustomerDetailsPageProps = {
  params: Promise<{
    slug: string;
    customerId: string;
  }>;
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

export default async function CustomerDetailsPage({
  params,
  searchParams,
}: CustomerDetailsPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const authenticatedUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { language: true, role: true, experienceAccess: true },
  });

  const { slug, customerId } = await params;
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
    include: {
      rewards: {
        where: {
          isActive: true,
        },
        orderBy: {
          cost: "asc",
        },
      },
    },
  });

  if (!business) {
    notFound();
  }

  const canAccess = canAccessBusiness(session.user, business.id);

  if (!canAccess) {
    redirect("/dashboard");
  }

  const canManageCustomer = canPerform(
    session.user,
    business.id,
    "CUSTOMERS_EDIT",
  );
  const canAdjustBalance = canPerform(
    session.user,
    business.id,
    "LOYALTY_ADJUST",
  );
  const canEarnLoyalty = canPerform(session.user, business.id, "LOYALTY_EARN");
  const canRedeemLoyalty = canPerform(
    session.user,
    business.id,
    "LOYALTY_REDEEM",
  );
  const canViewNotesTags = canViewCustomerNotesTags(
    session.user,
    business.id,
    business.plan,
  );
  const canManageNotesTags = canManageCustomerNotesTags(
    session.user,
    business.id,
    business.plan,
  );
  const canUseReferrals = canUseCustomerReferrals(
    session.user,
    business.id,
    business.plan,
  );

  const operationContextOptions = await getOperationContextOptions(prisma, {
    businessId: business.id,
    actor: session.user,
  });

  const customer = await prisma.customer.findFirst({
    where: {
      id: customerId,
      businessId: business.id,
    },
    include: {
      transactions: {
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
        include: {
          createdBy: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      activities: {
        where: {
          type: {
            in: [
              "CUSTOMER_CREATED",
              "CUSTOMER_UPDATED",
              "CUSTOMER_DEACTIVATED",
              "CUSTOMER_REACTIVATED",
              "CUSTOMER_TAG_ASSIGNED",
              "CUSTOMER_TAG_REMOVED",
              "CUSTOMER_NOTE_CREATED",
              "CUSTOMER_NOTE_UPDATED",
              "REWARD_UNLOCKED",
              "REWARD_EXPIRED",
              "REWARD_REDEMPTION_BLOCKED",
              "REFERRAL_RECORDED",
            ],
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
        include: {
          createdBy: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      rewardUnlocks: {
        where: {
          businessId: business.id,
          redeemedAt: null,
        },
        orderBy: {
          unlockedAt: "desc",
        },
      },
      referralCodes: {
        where: {
          businessId: business.id,
          isActive: true,
        },
        take: 1,
        select: {
          code: true,
        },
      },
      tagAssignments: {
        orderBy: { tag: { name: "asc" } },
        include: {
          tag: {
            select: { id: true, name: true },
          },
        },
      },
      notes: {
        orderBy: { updatedAt: "desc" },
        include: {
          createdBy: {
            select: { firstName: true, lastName: true },
          },
          updatedBy: {
            select: { firstName: true, lastName: true },
          },
        },
      },
      _count: {
        select: {
          redemptions: true,
          transactions: true,
        },
      },
    },
  });

  if (!customer) {
    notFound();
  }

  const operationContextFields = (disabled: boolean, idPrefix: string) => (
    <LoyaltyOperationContextFields
      branches={operationContextOptions.branches}
      staff={operationContextOptions.staff}
      branchRequired={operationContextOptions.branchRequired}
      staffAttributionEnabled={business.staffAttributionEnabled}
      staffAttributionRequired={business.staffAttributionRequired}
      idPrefix={idPrefix}
      disabled={disabled}
      language={language}
    />
  );

  const businessTags = canViewNotesTags
    ? await prisma.customerTag.findMany({
        where: { businessId: business.id },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
    : [];

  const baseUrl = await getRequestBaseUrl();

  const cardUrl = `${baseUrl}/card/${customer.publicToken}`;
  const referralLink =
    canUseReferrals && customer.referralCodes[0]
      ? `${baseUrl}/join/${business.slug}?ref=${customer.referralCodes[0].code}`
      : null;

  const qrCode = await QRCode.toDataURL(cardUrl, {
    width: 240,
    margin: 1,
    errorCorrectionLevel: "M",
  });

  const addLoyalty = addLoyaltyAction.bind(null, business.slug, customer.id);
  const loyaltyOperationId = randomUUID();
  const adjustmentOperationId = randomUUID();

  const availableRewards = getAvailableRewardOptions(business.rewards, {
    name: business.rewardName,
    description: business.rewardDescription,
    type: business.rewardType,
    code: business.rewardCode,
    cost: business.rewardThreshold,
  });
  const canonicalAvailability = getRewardAvailability({
    customerActive: customer.isActive,
    balance: customer.balance,
    rewardThreshold: business.rewardThreshold,
    fallbackReward: {
      name: business.rewardName,
      cost: business.rewardThreshold,
    },
    catalogueRewards: business.rewards,
  });

  const rewardUnlocksByRewardId = new Map(
    customer.rewardUnlocks.map((unlock) => [unlock.rewardId, unlock]),
  );

  const rewardStates = availableRewards.map((reward) => {
    const unlock = reward.id
      ? rewardUnlocksByRewardId.get(reward.id)
      : undefined;
    const expirationState = unlock
      ? getRewardUnlockLifecycleState({
          rewardActive: true,
          expiresAt: unlock.expiresAt,
          redeemedAt: unlock.redeemedAt,
          expiredAt: unlock.expiredAt,
        })
      : null;
    const progress = calculateRewardProgress(
      customer.balance,
      reward.cost,
      customer.isActive,
    );

    return {
      reward,
      ...progress,
      expirationState,
      expiresAt: unlock?.expiresAt ?? null,
      rewardAvailable: progress.rewardAvailable && expirationState === "ACTIVE",
    };
  });
  const rewardAvailable = rewardStates.some(
    (rewardState) => rewardState.rewardAvailable,
  );
  const remaining = canonicalAvailability.remaining;
  const loyaltyModeLabel = getLoyaltyModeLabel(language, business.loyaltyMode);
  const messageReward = canonicalAvailability.defaultReward;
  const cardTheme = getCustomerExperienceTheme(business);

  const updateCustomer = updateCustomerAction.bind(
    null,
    business.slug,
    customer.id,
  );

  const adjustCustomerBalance = adjustCustomerBalanceAction.bind(
    null,
    business.slug,
    customer.id,
  );
  const createReferralCode = createCustomerReferralCodeAction.bind(
    null,
    business.slug,
    customer.id,
  );
  const createAndAssignTag = createAndAssignCustomerTagAction.bind(
    null,
    business.slug,
    customer.id,
  );
  const createNote = createCustomerNoteCommandAction.bind(
    null,
    business.slug,
    customer.id,
  );

  const deactivateCustomer = setCustomerStatusAction.bind(
    null,
    business.slug,
    customer.id,
    false,
  );

  const reactivateCustomer = setCustomerStatusAction.bind(
    null,
    business.slug,
    customer.id,
    true,
  );

  const customerName = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(" ");

  const timeline = buildCustomerTimeline(
    customer.transactions,
    customer.activities,
    language,
  );

  const loyaltyPresentation = {
    loyaltyMode: business.loyaltyMode,
    language,
    unitName: business.unitName,
    currency: business.currency,
    earnAmount: business.earnAmount,
  } as const;
  const formatBalance = (amount: number) =>
    formatLoyaltyAmount({
      loyaltyMode: business.loyaltyMode,
      language,
      unitName: business.unitName,
      currency: business.currency,
      amount,
    });

  const whatsappContext = {
    customer: customerName,
    business: business.name,
    balance: customer.balance,
    unit: business.unitName,
    reward: messageReward.name,
    cardLink: cardUrl,
    remaining,
  };

  const welcomeWhatsAppUrl = buildWhatsAppUrl(
    customer.phone,
    renderWhatsAppTemplate(
      business.whatsappWelcomeMessage ?? DEFAULT_WHATSAPP_TEMPLATES.welcome,
      whatsappContext,
    ),
  );

  const balanceWhatsAppUrl = buildWhatsAppUrl(
    customer.phone,
    renderWhatsAppTemplate(
      business.whatsappBalanceMessage ?? DEFAULT_WHATSAPP_TEMPLATES.balance,
      whatsappContext,
    ),
  );

  const rewardWhatsAppUrl = buildWhatsAppUrl(
    customer.phone,
    renderWhatsAppTemplate(
      business.whatsappRewardMessage ?? DEFAULT_WHATSAPP_TEMPLATES.reward,
      whatsappContext,
    ),
  );

  const smartWhatsAppSuggestion = getCampaignSuggestion({
    operation: query.success,
    phone: customer.phone,
    context: whatsappContext,
    templates: {
      welcome: business.whatsappWelcomeMessage,
      balance: business.whatsappBalanceMessage,
      reward: business.whatsappRewardMessage,
    },
    rewardAvailable,
    isOneLoyaltyActionAway:
      business.loyaltyMode !== "SALES_AMOUNT" &&
      !rewardAvailable &&
      remaining > 0 &&
      remaining <= business.earnAmount,
  });
  const smartSuggestionCopy = smartWhatsAppSuggestion
    ? copy.campaignSuggestion[smartWhatsAppSuggestion.trigger]
    : null;

  return (
    <main
      className="min-h-screen bg-surface-subtle px-4 py-6 sm:px-8 sm:py-8"
      style={{
        backgroundImage:
          "radial-gradient(circle at top right, var(--lf-primary-soft), transparent 34rem)",
      }}
      data-experience-mode={experienceMode}
      data-experience-customer-detail={
        isSimpleExperience ? "simple" : "advanced"
      }
    >
      <div className="mx-auto max-w-7xl">
        <Link
          href={`/businesses/${business.slug}/customers`}
          className="inline-flex min-h-11 items-center rounded-full border border-primary/15 bg-white/90 px-4 py-2 text-sm font-bold text-primary shadow-sm transition hover:border-primary/30 hover:bg-primary-subtle"
        >
          <span aria-hidden="true" className="me-2">
            ←
          </span>
          {copy.backToCustomers}
        </Link>

        {query.success === "earned" && (
          <div className="mt-6 rounded-[var(--lf-radius-input)] border border-success/30 bg-success-subtle px-4 py-4 text-success">
            {copy.feedback.earned}
          </div>
        )}

        {query.success === "redeemed" && (
          <div className="mt-6 rounded-[var(--lf-radius-input)] border border-success/30 bg-success-subtle px-4 py-4 text-success">
            {copy.feedback.redeemed}
          </div>
        )}

        {query.success === "updated" && (
          <div className="mt-6 rounded-[var(--lf-radius-input)] border border-success/30 bg-success-subtle px-4 py-4 text-success">
            {copy.feedback.updated}
          </div>
        )}

        {query.success === "deactivated" && (
          <div className="mt-6 rounded-[var(--lf-radius-input)] border border-warning/30 bg-warning-subtle px-4 py-4 text-warning">
            {copy.feedback.deactivated}
          </div>
        )}

        {query.success === "reactivated" && (
          <div className="mt-6 rounded-[var(--lf-radius-input)] border border-success/30 bg-success-subtle px-4 py-4 text-success">
            {copy.feedback.reactivated}
          </div>
        )}

        {query.success === "adjusted" && (
          <div className="mt-6 rounded-[var(--lf-radius-input)] border border-success/30 bg-success-subtle px-4 py-4 text-success">
            {copy.feedback.adjusted}
          </div>
        )}

        {query.success === "referral-link" && (
          <div className="mt-6 rounded-[var(--lf-radius-input)] border border-success/30 bg-success-subtle px-4 py-4 text-success">
            {copy.feedback.referralLink}
          </div>
        )}

        {query.success === "tag-assigned" && (
          <div className="mt-6 rounded-[var(--lf-radius-input)] border border-success/30 bg-success-subtle px-4 py-4 text-success">
            {copy.feedback.tagAssigned}
          </div>
        )}

        {query.success === "tag-removed" && (
          <div className="mt-6 rounded-[var(--lf-radius-input)] border border-warning/30 bg-warning-subtle px-4 py-4 text-warning">
            {copy.feedback.tagRemoved}
          </div>
        )}

        {query.success === "note-created" && (
          <div className="mt-6 rounded-[var(--lf-radius-input)] border border-success/30 bg-success-subtle px-4 py-4 text-success">
            {copy.feedback.noteCreated}
          </div>
        )}

        {query.success === "note-updated" && (
          <div className="mt-6 rounded-[var(--lf-radius-input)] border border-success/30 bg-success-subtle px-4 py-4 text-success">
            {copy.feedback.noteUpdated}
          </div>
        )}

        {query.error === "adjustment-invalid" && (
          <div className="mt-6 rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-4 text-danger">
            {copy.feedback.adjustmentInvalid}
          </div>
        )}

        {query.error === "adjustment-negative" && (
          <div className="mt-6 rounded-[var(--lf-radius-input)] border border-warning/30 bg-warning-subtle px-4 py-4 text-warning">
            {copy.feedback.adjustmentNegative}
          </div>
        )}

        {query.error === "invalid" && (
          <div className="mt-6 rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-4 text-danger">
            {copy.invalidCustomer}
          </div>
        )}

        {query.error === "phone" && (
          <div className="mt-6 rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-4 text-danger">
            {copy.invalidPhone}
          </div>
        )}

        {query.error === "duplicate" && (
          <div className="mt-6 rounded-[var(--lf-radius-input)] border border-warning/30 bg-warning-subtle px-4 py-4 text-warning">
            {copy.feedback.duplicate}
          </div>
        )}

        {query.error === "not-enough" && (
          <div className="mt-6 rounded-[var(--lf-radius-input)] border border-warning/30 bg-warning-subtle px-4 py-4 text-warning">
            {copy.feedback.notEnough}
          </div>
        )}

        {query.error === "reward-expired" && (
          <div className="mt-6 rounded-[var(--lf-radius-input)] border border-warning/30 bg-warning-subtle px-4 py-4 text-warning">
            {copy.feedback.rewardExpired}
          </div>
        )}

        {query.error === "referral" && (
          <div className="mt-6 rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-4 text-danger">
            {copy.feedback.referral}
          </div>
        )}

        {(query.error === "tag-invalid" || query.error === "note-invalid") && (
          <div className="mt-6 rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-4 text-danger">
            {copy.feedback.tagOrNoteInvalid}
          </div>
        )}

        {query.error === "earned-too-soon" && (
          <div className="mt-6 rounded-[var(--lf-radius-input)] border border-warning/30 bg-warning-subtle px-4 py-4 text-warning">
            {copy.feedback.earnedTooSoon}
          </div>
        )}

        {query.error === "staff-attribution" && (
          <div className="mt-6 rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-4 text-danger">
            {copy.feedback.staffAttribution}
          </div>
        )}

        {query.error === "redeemed-too-soon" && (
          <div className="mt-6 rounded-[var(--lf-radius-input)] border border-warning/30 bg-warning-subtle px-4 py-4 text-warning">
            {copy.feedback.redeemedTooSoon}
          </div>
        )}

        {query.error === "subscription-restricted" && (
          <div className="mt-6 rounded-[var(--lf-radius-input)] border border-warning/30 bg-warning-subtle px-4 py-4 text-warning">
            {language === "AR"
              ? "لا تسمح حالة الاشتراك الحالية بتنفيذ تغيير تشغيلي جديد. تظل السجلات والبيانات الحالية متاحة للقراءة، وتظل إجراءات الأمان متاحة."
              : "The current subscription state does not allow a new operational change. Existing records and data remain readable, and security controls remain accessible."}
          </div>
        )}

        {!isSimpleExperience && smartWhatsAppSuggestion && (
          <section className="mt-6 flex flex-col gap-4 rounded-[var(--lf-radius-card)] border border-success/30 bg-success-subtle p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-black text-success">
                {smartSuggestionCopy?.title}
              </p>

              <p className="mt-1 text-sm leading-6 text-success">
                {smartSuggestionCopy?.description}
              </p>
            </div>

            <a
              href={smartWhatsAppSuggestion.url}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 rounded-[var(--lf-radius-input)] bg-success px-6 py-4 text-center font-bold text-[var(--lf-inverse)] transition hover:bg-success-subtle"
            >
              {smartSuggestionCopy?.button}
            </a>
          </section>
        )}

        <div className="mt-6 grid gap-7 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="flex min-w-0 flex-col">
            <header
              className="relative overflow-hidden rounded-[var(--lf-radius-card)] border border-primary/20 bg-gradient-to-br from-primary via-indigo-600 to-violet-700 p-5 text-white shadow-lg shadow-primary/15 sm:p-7"
              data-customer-profile-hero
            >
              <div
                aria-hidden="true"
                className="absolute -end-16 -top-20 size-56 rounded-full border-[32px] border-white/5"
              />
              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-xl font-black text-white shadow-inner backdrop-blur-sm">
                  {(customerName || "?").trim().charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/65">
                    {copy.profile}
                  </p>
                  <h1
                    dir="auto"
                    className="mt-1 truncate text-2xl font-black text-white sm:text-3xl"
                  >
                    {customerName}
                  </h1>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-bold ${customer.isActive ? "border-emerald-300/30 bg-emerald-300/15 text-emerald-50" : "border-red-300/30 bg-red-300/15 text-red-50"}`}
                    >
                      {customer.isActive ? copy.active : copy.inactive}
                    </span>
                    <span dir="ltr" className="font-semibold text-white/85">
                      {customer.phone}
                    </span>
                    <span
                      dir="ltr"
                      className="text-xs font-semibold text-white/60"
                    >
                      {copy.code}: {customer.customerCode}
                    </span>
                  </div>
                  {!isSimpleExperience &&
                  canViewNotesTags &&
                  customer.tagAssignments.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {customer.tagAssignments.map((assignment) => (
                        <span
                          key={assignment.id}
                          className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/85"
                        >
                          {assignment.tag.name}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="min-w-40">
                  <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/60">
                      {loyaltyModeLabel}
                    </p>
                    <p
                      dir={
                        business.loyaltyMode === "SALES_AMOUNT" ? "ltr" : "auto"
                      }
                      className="mt-1 text-xl font-black text-white"
                    >
                      {formatBalance(customer.balance)}
                    </p>
                  </div>
                </div>
              </div>
            </header>

            {isSimpleExperience ? (
              <section className="mt-5 rounded-[var(--lf-radius-card)] border border-primary/20 bg-primary-subtle/40 p-5 sm:p-6">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">
                  {copy.loyaltyToday}
                </p>
                <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                  <div>
                    <p
                      dir={
                        business.loyaltyMode === "SALES_AMOUNT" ? "ltr" : "auto"
                      }
                      className="text-4xl font-black text-foreground"
                    >
                      <span className="lf-type-numeric">
                        {formatBalance(customer.balance)}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-foreground-muted">
                      {rewardAvailable
                        ? copy.rewardReadyNamed(messageReward.name)
                        : copy.remainingForReward(
                            remaining,
                            messageReward.name,
                          )}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {canEarnLoyalty || canRedeemLoyalty ? (
                      <a
                        href="#daily-loyalty"
                        className="inline-flex min-h-11 items-center rounded-[var(--lf-radius-input)] bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
                      >
                        {copy.loyaltyAction}
                      </a>
                    ) : null}
                    <a
                      href="#customer-card"
                      className="inline-flex min-h-11 items-center rounded-[var(--lf-radius-input)] border border-border px-4 py-2 text-sm font-semibold text-primary hover:bg-surface-subtle"
                    >
                      {copy.customerCard}
                    </a>
                  </div>
                </div>
              </section>
            ) : null}

            {canViewNotesTags ? (
              <section
                className={`order-3 mt-6 rounded-[var(--lf-radius-card)] bg-white p-6 shadow-sm sm:p-8 ${isSimpleExperience ? "hidden" : ""}`}
              >
                <h2 className="text-xl font-bold text-foreground">
                  {copy.customerTags}
                </h2>

                <p className="mt-1 text-sm text-foreground-subtle">
                  {copy.tagsDescription}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {customer.tagAssignments.length === 0 ? (
                    <p className="text-sm text-foreground-subtle">
                      {copy.noTags}
                    </p>
                  ) : (
                    customer.tagAssignments.map((assignment) => {
                      const removeTag = removeCustomerTagAction.bind(
                        null,
                        business.slug,
                        customer.id,
                        assignment.tag.id,
                      );

                      return (
                        <span
                          key={assignment.id}
                          className="inline-flex items-center gap-2 rounded-full bg-primary-subtle px-4 py-2 text-sm font-semibold text-primary"
                        >
                          {assignment.tag.name}
                          {canManageNotesTags ? (
                            <form action={removeTag}>
                              <button
                                type="submit"
                                aria-label={copy.removeTag(assignment.tag.name)}
                                className="rounded-full px-1 text-primary hover:bg-primary-subtle hover:text-primary"
                              >
                                ×
                              </button>
                            </form>
                          ) : null}
                        </span>
                      );
                    })
                  )}
                </div>

                {canManageNotesTags ? (
                  <div className="mt-6 grid gap-4 border-t border-border pt-6 sm:grid-cols-2">
                    <form action={createAndAssignTag} className="flex gap-2">
                      <input
                        name="tagName"
                        maxLength={50}
                        required
                        placeholder={copy.newTagPlaceholder}
                        className="min-w-0 flex-1 rounded-[var(--lf-radius-input)] border border-border px-4 py-2 text-sm outline-none focus:border-primary/30"
                      />
                      <button
                        type="submit"
                        className="rounded-[var(--lf-radius-input)] bg-primary px-4 py-2 text-sm font-bold text-[var(--lf-primary-foreground)] hover:bg-primary-subtle"
                      >
                        {copy.add}
                      </button>
                    </form>

                    <div className="flex flex-wrap gap-2">
                      {businessTags
                        .filter(
                          (tag) =>
                            !customer.tagAssignments.some(
                              (assignment) => assignment.tag.id === tag.id,
                            ),
                        )
                        .map((tag) => {
                          const assignTag = assignCustomerTagAction.bind(
                            null,
                            business.slug,
                            customer.id,
                            tag.id,
                          );

                          return (
                            <form key={tag.id} action={assignTag}>
                              <button
                                type="submit"
                                className="rounded-[var(--lf-radius-input)] border border-primary/30 bg-primary-subtle px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-subtle"
                              >
                                + {tag.name}
                              </button>
                            </form>
                          );
                        })}
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}

            {canViewNotesTags ? (
              <section
                className={`order-4 mt-6 rounded-[var(--lf-radius-card)] bg-white p-6 shadow-sm sm:p-8 ${isSimpleExperience ? "hidden" : ""}`}
              >
                <h2 className="text-xl font-bold text-foreground">
                  {copy.notes}
                </h2>

                <p className="mt-1 text-sm text-foreground-subtle">
                  {copy.notesDescription}
                </p>

                {canManageNotesTags ? (
                  <form action={createNote} className="mt-6">
                    <label htmlFor="newCustomerNote" className="sr-only">
                      {copy.newInternalNote}
                    </label>
                    <textarea
                      id="newCustomerNote"
                      name="content"
                      required
                      minLength={1}
                      maxLength={2000}
                      rows={3}
                      placeholder={copy.notePlaceholder}
                      className="w-full resize-y rounded-[var(--lf-radius-input)] border border-border px-4 py-4 text-sm outline-none focus:border-primary/30"
                    />
                    <button
                      type="submit"
                      className="mt-4 rounded-[var(--lf-radius-input)] bg-foreground px-6 py-4 font-semibold text-white hover:bg-primary-subtle"
                    >
                      {copy.saveInternalNote}
                    </button>
                  </form>
                ) : null}

                <div className="mt-6 space-y-4">
                  {customer.notes.length === 0 ? (
                    <p className="text-sm text-foreground-subtle">
                      {copy.noNotes}
                    </p>
                  ) : (
                    customer.notes.map((note) => {
                      const updateNote = updateCustomerNoteCommandAction.bind(
                        null,
                        business.slug,
                        customer.id,
                        note.id,
                      );
                      const createdByName = note.createdBy
                        ? [note.createdBy.firstName, note.createdBy.lastName]
                            .filter(Boolean)
                            .join(" ")
                        : copy.deletedUser;
                      const updatedByName = note.updatedBy
                        ? [note.updatedBy.firstName, note.updatedBy.lastName]
                            .filter(Boolean)
                            .join(" ")
                        : copy.deletedUser;

                      return (
                        <article
                          key={note.id}
                          className="rounded-[var(--lf-radius-card)] border border-border bg-surface-subtle p-4"
                        >
                          {canManageNotesTags ? (
                            <form action={updateNote}>
                              <textarea
                                name="content"
                                defaultValue={note.content}
                                required
                                minLength={1}
                                maxLength={2000}
                                rows={3}
                                className="w-full resize-y rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-2 text-sm outline-none focus:border-primary/30"
                              />
                              <button
                                type="submit"
                                className="mt-4 rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground-muted hover:border-primary/30"
                              >
                                {copy.saveEdit}
                              </button>
                            </form>
                          ) : (
                            <p
                              dir="auto"
                              className="whitespace-pre-wrap text-sm leading-6 text-foreground-muted"
                            >
                              {note.content}
                            </p>
                          )}
                          <p className="mt-4 text-xs text-foreground-subtle">
                            {copy.addedBy(
                              createdByName,
                              note.createdAt.toLocaleString(dateLocale),
                            )}
                            {note.updatedAt.getTime() !==
                            note.createdAt.getTime()
                              ? copy.lastEditedBy(updatedByName)
                              : ""}
                          </p>
                        </article>
                      );
                    })
                  )}
                </div>
              </section>
            ) : null}

            <section
              id="daily-loyalty"
              className="order-1 mt-6 scroll-mt-6 rounded-[var(--lf-radius-card)] border border-border/80 bg-white p-5 shadow-sm sm:p-8"
            >
              <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm text-foreground-subtle">
                    {loyaltyModeLabel} ·{" "}
                    {business.loyaltyMode === "SALES_AMOUNT"
                      ? copy.eligibleSales
                      : business.loyaltyMode === "VISITS"
                        ? copy.visitsCount
                        : copy.pointsBalance}
                  </p>

                  <p
                    dir={
                      business.loyaltyMode === "SALES_AMOUNT" ? "ltr" : "auto"
                    }
                    className="mt-2 text-5xl font-bold text-foreground"
                  >
                    {formatBalance(customer.balance)}
                  </p>
                </div>

                <div
                  className={`rounded-[var(--lf-radius-card)] px-6 py-4 ${
                    rewardAvailable
                      ? "bg-success-subtle text-success"
                      : "bg-surface-subtle text-foreground-muted"
                  }`}
                >
                  <p className="text-sm font-semibold">
                    {rewardAvailable
                      ? copy.rewardsReady(
                          rewardStates.filter(
                            (rewardState) => rewardState.rewardAvailable,
                          ).length,
                        )
                      : copy.remaining(remaining)}
                  </p>

                  <p dir="auto" className="mt-1 text-xs">
                    {messageReward.name}
                  </p>
                </div>
              </div>

              <section className="mt-8 grid gap-4 md:grid-cols-2">
                {rewardStates.map((rewardState) => (
                  <article
                    key={rewardState.reward.id ?? "legacy-reward"}
                    className={`rounded-[var(--lf-radius-card)] border p-4 ${
                      rewardState.rewardAvailable
                        ? "border-success/30 bg-success-subtle"
                        : "border-border bg-surface-subtle"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="font-black text-foreground">
                          {rewardState.reward.name}
                        </h2>
                        <p className="mt-1 text-sm text-foreground-subtle">
                          {formatBalance(rewardState.reward.cost)}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-4 py-1 text-xs font-black ${
                          rewardState.expirationState === "EXPIRED"
                            ? "bg-danger-subtle text-danger"
                            : rewardState.rewardAvailable
                              ? "bg-success text-[var(--lf-inverse)]"
                              : "bg-surface-subtle text-foreground-muted"
                        }`}
                      >
                        {rewardState.expirationState === "EXPIRED"
                          ? copy.expired
                          : rewardState.rewardAvailable
                            ? copy.ready
                            : copy.remaining(rewardState.remaining)}
                      </span>
                    </div>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${rewardState.progress}%`,
                          backgroundColor: "var(--lf-primary)",
                        }}
                      />
                    </div>

                    <p className="mt-2 text-xs text-foreground-subtle">
                      <span
                        dir={
                          business.loyaltyMode === "SALES_AMOUNT"
                            ? "ltr"
                            : "auto"
                        }
                        className="lf-type-numeric"
                      >
                        {formatBalance(customer.balance)} /{" "}
                        {formatBalance(rewardState.reward.cost)}
                      </span>
                    </p>

                    {rewardState.expiresAt ? (
                      <p
                        className={`mt-2 text-xs font-bold ${
                          rewardState.expirationState === "EXPIRED"
                            ? "text-danger"
                            : "text-foreground-subtle"
                        }`}
                      >
                        {rewardState.expirationState === "EXPIRED"
                          ? copy.rewardExpired
                          : copy.rewardValidUntil(
                              new Intl.DateTimeFormat(dateLocale, {
                                dateStyle: "medium",
                                timeStyle: "short",
                                timeZone: "Africa/Cairo",
                              }).format(rewardState.expiresAt),
                            )}
                      </p>
                    ) : rewardState.reward.expiresAfterDays ? (
                      <p className="mt-2 text-xs text-foreground-subtle">
                        {copy.rewardStartsOnUnlock}
                      </p>
                    ) : null}

                    {rewardState.rewardAvailable &&
                    rewardState.reward.type === "PROMO_CODE" &&
                    rewardState.reward.code ? (
                      <p
                        dir="ltr"
                        className="mt-4 select-all rounded-[var(--lf-radius-input)] border border-success/30 bg-white px-4 py-2 text-center text-sm font-black tracking-widest text-success"
                      >
                        {rewardState.reward.code}
                      </p>
                    ) : null}

                    {rewardState.reward.description ? (
                      <p className="mt-4 text-xs leading-5 text-foreground-muted">
                        {rewardState.reward.description}
                      </p>
                    ) : null}
                  </article>
                ))}
              </section>

              {!customer.isActive && (
                <div className="mt-6 rounded-[var(--lf-radius-card)] border border-warning/30 bg-warning-subtle p-4 text-sm text-warning">
                  {copy.inactiveLoyaltyUnavailable}
                </div>
              )}

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <form
                  action={addLoyalty}
                  className={
                    business.loyaltyMode === "SALES_AMOUNT"
                      ? "w-full rounded-[var(--lf-radius-card)] border border-primary/30 bg-primary-subtle p-4 sm:max-w-md"
                      : "w-full sm:w-auto"
                  }
                >
                  <input
                    type="hidden"
                    name="operationId"
                    value={loyaltyOperationId}
                  />

                  {business.loyaltyMode === "SALES_AMOUNT" && (
                    <>
                      <label
                        htmlFor="saleAmount"
                        className="mb-2 block text-sm font-black text-primary"
                      >
                        {copy.saleAmount}
                      </label>

                      <div className="flex gap-2">
                        <input
                          id="saleAmount"
                          name="saleAmount"
                          type="number"
                          min="1"
                          max="1000000000"
                          step="1"
                          required
                          inputMode="numeric"
                          placeholder={copy.saleAmountPlaceholder}
                          disabled={!customer.isActive || !canEarnLoyalty}
                          className="min-w-0 flex-1 rounded-[var(--lf-radius-input)] border border-primary/30 bg-white px-4 py-4 text-lg font-black outline-none focus:border-primary/30 disabled:bg-surface-subtle"
                        />

                        <span
                          dir="auto"
                          className="flex items-center rounded-[var(--lf-radius-input)] bg-white px-4 font-black text-primary"
                        >
                          {operationalUnitLabel(loyaltyPresentation)}
                        </span>
                      </div>
                    </>
                  )}

                  {operationContextFields(
                    !customer.isActive || !canEarnLoyalty,
                    "earn-operation",
                  )}

                  <LoyaltySubmitButton
                    disabled={!customer.isActive || !canEarnLoyalty}
                    language={language}
                    className={
                      business.loyaltyMode === "SALES_AMOUNT"
                        ? "mt-4 w-full rounded-[var(--lf-radius-input)] bg-primary px-6 py-4 font-black text-[var(--lf-primary-foreground)] transition hover:bg-primary-subtle disabled:cursor-not-allowed disabled:bg-surface-subtle"
                        : "w-full rounded-[var(--lf-radius-input)] bg-foreground px-6 py-4 font-semibold text-white transition hover:bg-primary-subtle disabled:cursor-not-allowed disabled:bg-surface-subtle"
                    }
                  >
                    {business.loyaltyMode === "SALES_AMOUNT"
                      ? copy.recordSale
                      : business.loyaltyMode === "VISITS"
                        ? copy.addVisit
                        : copy.addPoints(business.earnAmount)}
                  </LoyaltySubmitButton>
                </form>

                <div className="grid w-full gap-4 sm:w-auto">
                  {rewardStates.map((rewardState) => {
                    const { reward } = rewardState;
                    const redeemReward = redeemRewardAction.bind(
                      null,
                      business.slug,
                      customer.id,
                      reward.id ?? undefined,
                    );

                    return (
                      <RedeemRewardDialog
                        key={reward.id ?? "legacy-reward"}
                        action={redeemReward}
                        disabled={
                          !customer.isActive ||
                          !canRedeemLoyalty ||
                          customer.balance < reward.cost ||
                          rewardState.expirationState === "EXPIRED"
                        }
                        rewardName={reward.name}
                        cost={reward.cost}
                        unitName={business.unitName}
                        operationId={randomUUID()}
                        operationContextFields={operationContextFields(
                          !customer.isActive ||
                            !canRedeemLoyalty ||
                            customer.balance < reward.cost ||
                            rewardState.expirationState === "EXPIRED",
                          `redeem-${reward.id ?? "legacy"}`,
                        )}
                        language={language}
                      />
                    );
                  })}
                </div>
              </div>
            </section>

            {canManageCustomer && (
              <section
                className={`order-5 mt-6 rounded-[var(--lf-radius-card)] bg-white p-6 shadow-sm sm:p-8 ${isSimpleExperience ? "hidden" : ""}`}
              >
                <h2 className="text-xl font-bold text-foreground">
                  {copy.manageCustomer}
                </h2>

                <p className="mt-1 text-sm text-foreground-subtle">
                  {copy.manageDescription}
                </p>

                <form
                  action={updateCustomer}
                  className="mt-6 grid gap-4 sm:grid-cols-2"
                >
                  <div>
                    <label
                      htmlFor="editFirstName"
                      className="mb-2 block text-sm font-medium text-foreground-muted"
                    >
                      {copy.firstName}
                    </label>

                    <input
                      id="editFirstName"
                      name="firstName"
                      defaultValue={customer.firstName}
                      required
                      dir="auto"
                      minLength={2}
                      maxLength={50}
                      className="w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-4 outline-none focus:border-primary/30"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="editLastName"
                      className="mb-2 block text-sm font-medium text-foreground-muted"
                    >
                      {copy.lastName}
                    </label>

                    <input
                      id="editLastName"
                      name="lastName"
                      defaultValue={customer.lastName ?? ""}
                      maxLength={50}
                      dir="auto"
                      className="w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-4 outline-none focus:border-primary/30"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="editPhone"
                      className="mb-2 block text-sm font-medium text-foreground-muted"
                    >
                      {copy.phone}
                    </label>

                    <input
                      id="editPhone"
                      name="phone"
                      type="tel"
                      defaultValue={customer.phone}
                      dir="ltr"
                      required
                      className="w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-4 outline-none focus:border-primary/30"
                    />
                  </div>

                  <button
                    type="submit"
                    className="rounded-[var(--lf-radius-input)] bg-primary px-6 py-4 font-semibold text-[var(--lf-primary-foreground)] transition hover:bg-primary-subtle sm:col-span-2"
                  >
                    {copy.saveCustomer}
                  </button>
                </form>

                {canAdjustBalance ? (
                  <div className="mt-8 border-t border-border pt-6">
                    <h3 className="font-bold text-foreground">
                      {copy.manualBalance}
                    </h3>

                    <p className="mt-1 text-sm text-foreground-subtle">
                      {copy.manualBalanceDescription}
                    </p>

                    <p className="mt-4 text-sm font-semibold text-primary">
                      {copy.currentBalance(formatBalance(customer.balance), "")}
                    </p>

                    <form
                      action={adjustCustomerBalance}
                      className="mt-6 grid gap-4 sm:grid-cols-2"
                    >
                      <input
                        type="hidden"
                        name="operationId"
                        value={adjustmentOperationId}
                      />
                      {operationContextFields(false, "adjust-operation")}
                      <div>
                        <label
                          htmlFor="adjustmentDirection"
                          className="mb-2 block text-sm font-medium text-foreground-muted"
                        >
                          {copy.adjustmentType}
                        </label>

                        <select
                          id="adjustmentDirection"
                          name="direction"
                          defaultValue="ADD"
                          className="w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4 outline-none focus:border-primary/30"
                        >
                          <option value="ADD">{copy.addBalance}</option>

                          <option value="SUBTRACT">
                            {copy.subtractBalance}
                          </option>
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="adjustmentAmount"
                          className="mb-2 block text-sm font-medium text-foreground-muted"
                        >
                          {copy.amount}
                        </label>

                        <input
                          id="adjustmentAmount"
                          name="amount"
                          type="number"
                          min="1"
                          max="1000000"
                          required
                          placeholder="1"
                          className="w-full rounded-[var(--lf-radius-input)] border border-border px-4 py-4 outline-none focus:border-primary/30"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label
                          htmlFor="adjustmentReason"
                          className="mb-2 block text-sm font-medium text-foreground-muted"
                        >
                          {copy.adjustmentReason}
                        </label>

                        <textarea
                          id="adjustmentReason"
                          name="reason"
                          required
                          minLength={3}
                          maxLength={200}
                          rows={3}
                          placeholder={copy.adjustmentReasonPlaceholder}
                          className="w-full resize-none rounded-[var(--lf-radius-input)] border border-border px-4 py-4 outline-none focus:border-primary/30"
                        />
                      </div>

                      <button
                        type="submit"
                        className="rounded-[var(--lf-radius-input)] bg-warning-subtle px-6 py-4 font-semibold text-foreground transition hover:bg-warning-subtle sm:col-span-2"
                      >
                        {copy.saveBalanceAdjustment}
                      </button>
                    </form>
                  </div>
                ) : null}

                <div className="mt-8 border-t border-border pt-6">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                      <h3 className="font-bold text-foreground">
                        {copy.accountStatus}
                      </h3>

                      <p className="mt-1 text-sm text-foreground-subtle">
                        {copy.inactiveAccountDescription}
                      </p>
                    </div>

                    <form
                      action={
                        customer.isActive
                          ? deactivateCustomer
                          : reactivateCustomer
                      }
                    >
                      <button
                        type="submit"
                        className={
                          customer.isActive
                            ? "rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-6 py-4 font-semibold text-danger transition hover:bg-danger-subtle"
                            : "rounded-[var(--lf-radius-input)] bg-success px-6 py-4 font-semibold text-[var(--lf-inverse)] transition hover:bg-success-subtle"
                        }
                      >
                        {customer.isActive
                          ? copy.deactivateCustomer
                          : copy.reactivateCustomer}
                      </button>
                    </form>
                  </div>
                </div>
              </section>
            )}

            <ActivityTimeline
              items={timeline}
              dateLocale={dateLocale}
              rewardThreshold={business.rewardThreshold}
              formatBalance={formatBalance}
              labels={{
                title: copy.timeline,
                description: copy.timelineDescription,
                empty: copy.noEvents,
                requiresReview: copy.requiresReview,
                by: copy.by,
                balanceAfter: copy.balanceAfter,
              }}
            />
          </div>

          <aside
            id="customer-card"
            className="h-fit scroll-mt-6 rounded-[var(--lf-radius-card)] border border-border/80 bg-white p-4 shadow-lg shadow-slate-200/40 xl:sticky xl:top-24"
          >
            <LoyaltyCardPreview
              language={language}
              businessName={business.name}
              logoUrl={business.logoUrl}
              primaryColor={cardTheme.primaryColor}
              themePreset={business.themePreset}
              customerName={customerName}
              customerId={customer.customerCode}
              balance={customer.balance}
              loyaltyMode={business.loyaltyMode}
              unitName={business.unitName}
              currency={business.currency}
              rewardName={messageReward.name}
              rewardThreshold={messageReward.cost}
              qrCode={qrCode}
              artworkEnabled={business.standardCardArtworkEnabled}
              artworkCategory={business.standardCardArtworkCategory}
              designMode={business.cardDesignMode}
              customDesignEnabled={business.customCardArtworkEnabled}
              customFrontArtworkUrl={publicCustomCardArtworkUrl(
                customer.publicToken,
                "front",
                business.customCardFrontArtworkUrl,
                business.id,
              )}
              customBackArtworkUrl={publicCustomCardArtworkUrl(
                customer.publicToken,
                "back",
                business.customCardBackArtworkUrl,
                business.id,
              )}
              customSafeZoneVersion={business.customCardSafeZoneVersion}
              businessPhone={business.contactPhone}
              businessWebsite={business.website}
              businessLocation={[business.city, business.country]
                .filter(Boolean)
                .join(", ")}
              businessAddress={business.address}
              businessSocial={business.instagramUrl}
            />

            <div className="mt-4 flex flex-col gap-3">
              <Link
                href={`/card/${customer.publicToken}`}
                target="_blank"
                className="rounded-[var(--lf-radius-input)] bg-foreground px-5 py-3 text-center font-semibold text-white transition hover:bg-primary-subtle"
              >
                {copy.openCard}
              </Link>

              <CopyLinkButton value={cardUrl} language={language} />

              {canUseReferrals ? (
                referralLink ? (
                  <CopyLinkButton
                    value={referralLink}
                    label={copy.copyReferral}
                    language={language}
                  />
                ) : (
                  <form action={createReferralCode}>
                    <button
                      type="submit"
                      className="w-full rounded-[var(--lf-radius-input)] border border-primary/30 bg-primary-subtle px-5 py-3 font-semibold text-primary transition hover:bg-primary-subtle"
                    >
                      {copy.createReferral}
                    </button>
                  </form>
                )
              ) : null}

              <a
                href={welcomeWhatsAppUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full rounded-[var(--lf-radius-input)] bg-success px-5 py-3 text-center font-semibold text-[var(--lf-inverse)] transition hover:bg-success-subtle"
              >
                {copy.welcomeMessage}
              </a>

              <a
                href={balanceWhatsAppUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-[var(--lf-radius-input)] bg-info px-5 py-3 text-center font-semibold text-[var(--lf-inverse)] transition hover:bg-info-subtle"
              >
                {copy.balanceMessage}
              </a>

              {rewardAvailable ? (
                <a
                  href={rewardWhatsAppUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-[var(--lf-radius-input)] bg-warning-subtle px-5 py-3 text-center font-semibold text-foreground transition hover:bg-warning-subtle"
                >
                  {copy.rewardMessage}
                </a>
              ) : null}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
