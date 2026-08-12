import { randomUUID } from "node:crypto";

import { auth } from "@/auth";
import ScanActionButton from "@/components/scan-action-button";
import LoyaltyOperationContextFields from "@/components/loyalty-operation-context-fields";
import {
  PageContainer,
  PageHeader,
  SectionHeader,
} from "@/components/page-layout";
import { Card } from "@/components/ui/card";
import { Inset } from "@/components/ui/inset";
import {
  addLoyaltyAction,
  redeemRewardAction,
} from "@/app/businesses/[slug]/customers/[customerId]/actions";
import { getLanguageLocale, normalizeLanguage } from "@/lib/i18n";
import { getOperationContextOptions } from "@/lib/loyalty/operation-context";
import {
  earnActionLabel,
  formatLoyaltyAmount,
} from "@/lib/loyalty/presentation";
import { isRewardUnlockActionable } from "@/lib/rewards/expiration";
import { canAccessBusiness, canPerform } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { scanUiCopy } from "@/lib/scan/copy";
import type { ScanOperationError } from "@/lib/loyalty/operation-origin";
import {
  ArrowLeft,
  CheckCircle2,
  Gift,
  History,
  ScanLine,
  Sparkles,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ slug: string; customerId: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
};

export default async function ScanCustomerPage({
  params,
  searchParams,
}: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const authenticatedUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { language: true },
  });
  const language = normalizeLanguage(authenticatedUser?.language);
  const copy = scanUiCopy(language);
  const { slug, customerId } = await params;
  const query = await searchParams;

  const business = await prisma.business.findUnique({
    where: { slug },
    select: {
      primaryColor: true,
      secondaryColor: true,
      themePreset: true,
      cardStyle: true,
      fontFamily: true,
      id: true,
      staffAttributionEnabled: true,
      staffAttributionRequired: true,
    },
  });
  if (!business) notFound();
  if (!canAccessBusiness(session.user, business.id)) redirect("/dashboard");

  const canEarn = canPerform(session.user, business.id, "LOYALTY_EARN");
  const canRedeem = canPerform(session.user, business.id, "LOYALTY_REDEEM");
  const operationContextOptions = await getOperationContextOptions(prisma, {
    businessId: business.id,
    actor: session.user,
  });
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

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, businessId: business.id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      balance: true,
      transactions: {
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          amount: true,
          note: true,
          createdAt: true,
          createdBy: { select: { email: true } },
        },
      },
      rewardUnlocks: {
        where: { redeemedAt: null },
        include: {
          reward: {
            select: {
              id: true,
              name: true,
              type: true,
              code: true,
              isActive: true,
            },
          },
        },
      },
      business: {
        select: {
          name: true,
          slug: true,
          loyaltyMode: true,
          earnAmount: true,
          unitName: true,
          currency: true,
        },
      },
    },
  });
  if (!customer) notFound();

  const earnAction = addLoyaltyAction.bind(null, slug, customer.id);
  const fullName = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(" ");
  const dateFormatter = new Intl.DateTimeFormat(getLanguageLocale(language), {
    dateStyle: "short",
    timeStyle: "short",
  });
  const success =
    query.success === "earned" || query.success === "redeemed"
      ? query.success
      : null;
  const knownErrors: ScanOperationError[] = [
    "invalid",
    "permission",
    "reward-unavailable",
    "insufficient-balance",
    "conflict",
    "invalid-branch",
    "invalid-staff",
    "generic",
  ];
  const error = knownErrors.includes(query.error as ScanOperationError)
    ? (query.error as ScanOperationError)
    : null;
  const successMessage =
    success === "earned"
      ? copy.earnSuccess
      : success === "redeemed"
        ? copy.redeemSuccess
        : null;
  const errorMessage = error ? copy.operationErrors[error] : null;
  const scanCustomerPath = `/businesses/${slug}/scan/customer/${customer.id}`;
  const transactionPresentation = (type: string) =>
    type === "REDEEM"
      ? { icon: "🎁", title: copy.redeemActivity, color: "bg-primary-subtle" }
      : type === "ADJUSTMENT"
        ? {
            icon: "⚙️",
            title: copy.adjustmentActivity,
            color: "bg-warning-subtle",
          }
        : { icon: "⭐", title: copy.earnActivity, color: "bg-success-subtle" };
  const loyaltyPresentation = {
    loyaltyMode: customer.business.loyaltyMode,
    language,
    unitName: customer.business.unitName,
    currency: customer.business.currency,
    earnAmount: customer.business.earnAmount,
  } as const;
  const usableUnlocks = customer.rewardUnlocks.filter((unlock) =>
    isRewardUnlockActionable({
      ...unlock,
      rewardActive: unlock.reward.isActive,
    }),
  );

  return (
    <main className="min-h-full bg-[radial-gradient(circle_at_top,var(--lf-primary-soft),transparent_34rem)] py-6 sm:py-10">
      <PageContainer variant="narrow" className="px-4 sm:px-6">
        <PageHeader
          eyebrow={customer.business.name}
          title={fullName || copy.customerCard}
          metadata={<span dir="ltr">{customer.phone}</span>}
          secondaryActions={
            <Link
              href={`/businesses/${slug}/scan`}
              className="inline-flex min-h-11 items-center gap-2 rounded-[var(--lf-radius-input)] border border-border bg-surface/85 px-4 text-sm font-semibold text-foreground-muted shadow-sm transition hover:border-primary/25 hover:text-primary"
            >
              <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
              {copy.backToScanner}
            </Link>
          }
        />

        {successMessage ? (
          <Card
            role="status"
            className="overflow-hidden border-success/25 bg-gradient-to-br from-success-subtle via-surface to-primary-subtle/40 p-6 sm:p-8"
          >
            <span className="flex size-12 items-center justify-center rounded-2xl bg-success text-white shadow-sm">
              <CheckCircle2 className="size-6" aria-hidden="true" />
            </span>
            <p className="mt-4 lf-type-supporting font-semibold text-success">
              {successMessage}
            </p>
            <section aria-label={copy.balance}>
              <p className="mt-4 text-sm font-semibold text-success">
                {copy.updatedBalance}
              </p>
              <p
                dir={
                  customer.business.loyaltyMode === "SALES_AMOUNT"
                    ? "ltr"
                    : "auto"
                }
                className="mt-1 lf-type-display lf-type-numeric text-foreground"
              >
                {formatLoyaltyAmount({
                  ...loyaltyPresentation,
                  amount: customer.balance,
                })}
              </p>
            </section>
            <nav aria-label={copy.scan} className="mt-6 grid gap-4">
              <Link
                href={`/businesses/${slug}/scan`}
                className="inline-flex min-h-12 items-center justify-center rounded-[var(--lf-radius-input)] bg-primary px-6 text-center font-semibold text-white hover:bg-primary-hover"
              >
                {copy.scanNext}
              </Link>
              <Link
                href={scanCustomerPath}
                className="inline-flex min-h-12 items-center justify-center rounded-[var(--lf-radius-input)] border border-border-strong bg-surface px-6 text-center font-semibold text-foreground-muted hover:bg-surface-subtle"
              >
                {copy.performAnotherOperation}
              </Link>
              <Link
                href={`/businesses/${slug}/customers/${customer.id}`}
                className="inline-flex min-h-11 items-center justify-center rounded-[var(--lf-radius-input)] px-6 text-center text-sm font-semibold text-foreground-muted hover:bg-white/60"
              >
                {copy.openFullProfile}
              </Link>
            </nav>
          </Card>
        ) : (
          <>
            {errorMessage ? (
              <div
                role="alert"
                className="rounded-2xl border border-danger/30 bg-danger-subtle p-4 font-semibold text-danger shadow-sm"
              >
                {errorMessage}
              </div>
            ) : null}

            <Card
              role="region"
              aria-label={copy.balance}
              className="relative overflow-hidden border-primary/15 bg-gradient-to-br from-primary via-indigo-600 to-violet-700 p-5 text-white shadow-[0_24px_70px_-32px_rgba(79,70,229,0.75)] sm:p-7"
            >
              <div
                className="absolute -end-12 -top-14 size-40 rounded-full border border-white/10 bg-white/5"
                aria-hidden="true"
              />
              <div className="relative flex items-start gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
                  <UserRound className="size-6" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p dir="auto" className="truncate text-lg font-bold">
                    {fullName || copy.customerCard}
                  </p>
                  <p dir="ltr" className="mt-0.5 text-sm text-white/70">
                    {customer.phone}
                  </p>
                </div>
                <Sparkles
                  className="ms-auto size-5 shrink-0 text-indigo-200"
                  aria-hidden="true"
                />
              </div>
              <div className="relative mt-7 border-t border-white/15 pt-5">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-100">
                  {copy.balance}
                </p>
                <p
                  dir={
                    customer.business.loyaltyMode === "SALES_AMOUNT"
                      ? "ltr"
                      : "auto"
                  }
                  className="mt-2 lf-type-display lf-type-numeric font-black text-white"
                >
                  {formatLoyaltyAmount({
                    ...loyaltyPresentation,
                    amount: customer.balance,
                  })}
                </p>
              </div>
            </Card>

            <section aria-label={copy.operationWorkspace} className="space-y-5">
              {canEarn ? (
                <Card className="border-primary/15 p-5 sm:p-6">
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-subtle text-primary">
                      <ScanLine className="size-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="lf-type-supporting font-semibold text-foreground-muted">
                        {copy.earnOperation}
                      </p>
                      <h2 className="mt-1 lf-type-section text-foreground">
                        {earnActionLabel(loyaltyPresentation)}
                      </h2>
                    </div>
                  </div>
                  <form action={earnAction} className="mt-4">
                    {customer.business.loyaltyMode === "SALES_AMOUNT" ? (
                      <input
                        name="saleAmount"
                        type="number"
                        inputMode="decimal"
                        placeholder={copy.saleAmountPlaceholder}
                        aria-label={copy.saleAmountPlaceholder}
                        className="mb-4 min-h-12 w-full rounded-[var(--lf-radius-input)] border border-border bg-surface px-4 font-semibold"
                      />
                    ) : null}
                    {operationContextFields(!canEarn, "scan-earn-operation")}
                    <input
                      type="hidden"
                      name="operationId"
                      value={randomUUID()}
                    />
                    <input type="hidden" name="operationOrigin" value="SCAN" />
                    <ScanActionButton language={language}>
                      {earnActionLabel(loyaltyPresentation)}
                    </ScanActionButton>
                  </form>
                </Card>
              ) : null}

              {usableUnlocks.length ? (
                <section
                  aria-label={copy.availableRewards}
                  className="rounded-2xl border border-success/15 bg-success-subtle/25 p-4 sm:p-5"
                >
                  <SectionHeader
                    title={copy.availableRewards}
                    description={copy.redeemSuccess}
                  />
                  <div className="mt-4 space-y-4">
                    {usableUnlocks.map((unlock) => {
                      const redeemAction = redeemRewardAction.bind(
                        null,
                        slug,
                        customer.id,
                        unlock.reward.id,
                      );
                      return (
                        <Card
                          key={unlock.id}
                          role="region"
                          aria-labelledby={`scan-reward-${unlock.id}-title`}
                          className="border-success/20 p-5 shadow-sm"
                        >
                          <div className="flex items-start gap-3">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success-subtle text-success">
                              <Gift className="size-5" aria-hidden="true" />
                            </span>
                            <div>
                              <p
                                id={`scan-reward-${unlock.id}-title`}
                                className="font-semibold text-foreground"
                              >
                                {unlock.reward.name}
                              </p>
                              {unlock.reward.code ? (
                                <p className="mt-1 text-sm text-foreground-muted">
                                  {copy.rewardCode}:{" "}
                                  <span dir="ltr">{unlock.reward.code}</span>
                                </p>
                              ) : null}
                            </div>
                          </div>
                          {canRedeem ? (
                            <form action={redeemAction} className="mt-4">
                              <input
                                type="hidden"
                                name="operationId"
                                value={randomUUID()}
                              />
                              <input
                                type="hidden"
                                name="operationOrigin"
                                value="SCAN"
                              />
                              {operationContextFields(
                                !canRedeem,
                                `scan-redeem-${unlock.id}`,
                              )}
                              <ScanActionButton language={language}>
                                {copy.redeemReward}
                              </ScanActionButton>
                            </form>
                          ) : null}
                        </Card>
                      );
                    })}
                  </div>
                </section>
              ) : canRedeem ? (
                <Inset className="mt-4 text-sm text-foreground-muted">
                  {copy.noAvailableRewards}
                </Inset>
              ) : null}
            </section>

            <details className="group rounded-2xl border border-border bg-surface/90 shadow-sm">
              <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-5 py-4 text-sm font-bold text-foreground">
                <span className="flex size-9 items-center justify-center rounded-lg bg-surface-subtle text-foreground-muted">
                  <History className="size-4" aria-hidden="true" />
                </span>
                {copy.activity}
                <span className="ms-auto rounded-full bg-surface-subtle px-2.5 py-1 text-xs font-semibold text-foreground-subtle">
                  {customer.transactions.length}
                </span>
              </summary>
              {customer.transactions.length ? (
                <div className="space-y-3 border-t border-border p-4 sm:p-5">
                  {customer.transactions.map((transaction) => {
                    const presentation = transactionPresentation(
                      transaction.type,
                    );
                    return (
                      <Inset
                        key={transaction.id}
                        className={presentation.color}
                      >
                        <p className="font-semibold text-foreground">
                          {presentation.icon} {presentation.title}
                        </p>
                        <p className="mt-1 text-sm text-foreground-muted">
                          {transaction.note ?? copy.loyaltyOperation}
                        </p>
                        <p
                          dir={
                            customer.business.loyaltyMode === "SALES_AMOUNT"
                              ? "ltr"
                              : "auto"
                          }
                          className="mt-1 font-semibold text-foreground"
                        >
                          {formatLoyaltyAmount({
                            ...loyaltyPresentation,
                            amount: transaction.amount,
                          })}
                        </p>
                        {transaction.createdBy?.email ? (
                          <p className="mt-1 text-xs font-semibold text-foreground-subtle">
                            {copy.by}: {transaction.createdBy.email}
                          </p>
                        ) : null}
                        <p className="mt-1 text-xs text-foreground-subtle">
                          {dateFormatter.format(transaction.createdAt)}
                        </p>
                      </Inset>
                    );
                  })}
                </div>
              ) : (
                <div className="border-t border-border p-4">
                  <Inset className="text-sm text-foreground-muted">
                    {copy.noActivity}
                  </Inset>
                </div>
              )}
            </details>

            <nav
              aria-label={copy.scan}
              className="grid gap-3 pb-4 sm:grid-cols-2"
            >
              <Link
                href={`/businesses/${slug}/scan`}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--lf-radius-input)] bg-primary px-6 text-center font-semibold text-white shadow-sm transition hover:bg-primary-hover"
              >
                <ScanLine className="size-5" aria-hidden="true" />
                {copy.scanNext}
              </Link>
              <Link
                href={`/businesses/${slug}/customers/${customer.id}`}
                className="inline-flex min-h-12 items-center justify-center rounded-[var(--lf-radius-input)] border border-border-strong bg-surface px-6 text-center font-semibold text-foreground-muted hover:bg-surface-subtle"
              >
                {copy.openFullProfile}
              </Link>
            </nav>
          </>
        )}
      </PageContainer>
    </main>
  );
}
