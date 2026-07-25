import { randomUUID } from "node:crypto";

import { auth } from "@/auth";
import ScanActionButton from "@/components/scan-action-button";
import LoyaltyOperationContextFields from "@/components/loyalty-operation-context-fields";
import { PageContainer, PageHeader, SectionHeader } from "@/components/page-layout";
import { Card } from "@/components/ui/card";
import { Inset } from "@/components/ui/inset";
import {
  addLoyaltyAction,
  redeemRewardAction,
} from "@/app/businesses/[slug]/customers/[customerId]/actions";
import { getLanguageLocale, normalizeLanguage } from "@/lib/i18n";
import { getOperationContextOptions } from "@/lib/loyalty/operation-context";
import { canAccessBusiness, canPerform } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { scanUiCopy } from "@/lib/scan/copy";
import type { ScanOperationError } from "@/lib/loyalty/operation-origin";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ slug: string; customerId: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
};

export default async function ScanCustomerPage({ params, searchParams }: PageProps) {
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
      primaryColor: true, secondaryColor: true, themePreset: true, cardStyle: true,
      fontFamily: true, id: true, staffAttributionEnabled: true, staffAttributionRequired: true,
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
      id: true, firstName: true, lastName: true, phone: true, balance: true,
      transactions: {
        take: 5, orderBy: { createdAt: "desc" },
        select: { id: true, type: true, amount: true, note: true, createdAt: true, createdBy: { select: { email: true } } },
      },
      rewardUnlocks: {
        where: { redeemedAt: null },
        include: { reward: { select: { id: true, name: true, type: true, code: true } } },
      },
      business: { select: { name: true, slug: true, loyaltyMode: true, earnAmount: true, unitName: true } },
    },
  });
  if (!customer) notFound();

  const earnAction = addLoyaltyAction.bind(null, slug, customer.id);
  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(" ");
  const dateFormatter = new Intl.DateTimeFormat(getLanguageLocale(language), { dateStyle: "short", timeStyle: "short" });
  const success = query.success === "earned" || query.success === "redeemed" ? query.success : null;
  const knownErrors: ScanOperationError[] = ["invalid", "permission", "reward-unavailable", "insufficient-balance", "conflict", "invalid-branch", "invalid-staff", "generic"];
  const error = knownErrors.includes(query.error as ScanOperationError)
    ? query.error as ScanOperationError
    : null;
  const successMessage = success === "earned" ? copy.earnSuccess : success === "redeemed" ? copy.redeemSuccess : null;
  const errorMessage = error ? copy.operationErrors[error] : null;
  const scanCustomerPath = `/businesses/${slug}/scan/customer/${customer.id}`;
  const transactionPresentation = (type: string) => type === "REDEEM"
    ? { icon: "🎁", title: copy.redeemActivity, color: "bg-primary-subtle" }
    : type === "ADJUSTMENT"
      ? { icon: "⚙️", title: copy.adjustmentActivity, color: "bg-warning-subtle" }
      : { icon: "⭐", title: copy.earnActivity, color: "bg-success-subtle" };

  return (
    <main className="min-h-full py-6 sm:py-8">
      <PageContainer variant="narrow" className="px-4 sm:px-6">
        <PageHeader
          eyebrow={customer.business.name}
          title={fullName || copy.customerCard}
          metadata={<span dir="ltr">{customer.phone}</span>}
          secondaryActions={<Link href={`/businesses/${slug}/scan`} className="inline-flex min-h-11 items-center rounded-[var(--lf-radius-input)] border border-border bg-surface px-4 text-sm font-semibold text-foreground-muted hover:bg-surface-subtle">{copy.backToScanner}</Link>}
        />

        {successMessage ? <Card role="status" className="border-success/30 bg-success-subtle p-6">
          <p className="lf-type-supporting font-semibold text-success">{successMessage}</p>
          <section aria-label={copy.balance}>
            <p className="mt-4 text-sm font-semibold text-success">{copy.updatedBalance}</p>
            <p className="mt-1 lf-type-display lf-type-numeric text-foreground">{customer.balance} {customer.business.unitName}</p>
          </section>
          <nav aria-label={copy.scan} className="mt-6 grid gap-4">
            <Link href={`/businesses/${slug}/scan`} className="inline-flex min-h-12 items-center justify-center rounded-[var(--lf-radius-input)] bg-primary px-6 text-center font-semibold text-white hover:bg-primary-hover">{copy.scanNext}</Link>
            <Link href={scanCustomerPath} className="inline-flex min-h-12 items-center justify-center rounded-[var(--lf-radius-input)] border border-border-strong bg-surface px-6 text-center font-semibold text-foreground-muted hover:bg-surface-subtle">{copy.performAnotherOperation}</Link>
            <Link href={`/businesses/${slug}/customers/${customer.id}`} className="inline-flex min-h-11 items-center justify-center rounded-[var(--lf-radius-input)] px-6 text-center text-sm font-semibold text-foreground-muted hover:bg-white/60">{copy.openFullProfile}</Link>
          </nav>
        </Card> : <>
        {errorMessage ? <div role="alert" className="rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle p-4 font-semibold text-danger">{errorMessage}</div> : null}

        <Card role="region" aria-label={copy.balance} className="p-6">
          <p className="lf-type-supporting font-semibold text-primary">{copy.balance}</p>
          <p className="mt-1 lf-type-display lf-type-numeric text-foreground">{customer.balance} {customer.business.unitName}</p>
        </Card>

        <section aria-label={copy.operationWorkspace}>
        {canEarn ? <Card className="p-6">
          <p className="lf-type-supporting font-semibold text-foreground-muted">{copy.earnOperation}</p>
          <h2 className="mt-1 lf-type-section text-foreground">{customer.business.loyaltyMode === "SALES_AMOUNT" ? copy.addSale : customer.business.loyaltyMode === "VISITS" ? copy.addVisit : copy.addPoints}</h2>
          <form action={earnAction} className="mt-4">
            {customer.business.loyaltyMode === "SALES_AMOUNT" ? <input name="saleAmount" type="number" inputMode="decimal" placeholder={copy.saleAmountPlaceholder} aria-label={copy.saleAmountPlaceholder} className="mb-4 min-h-12 w-full rounded-[var(--lf-radius-input)] border border-border bg-surface px-4 font-semibold" /> : null}
            {operationContextFields(!canEarn, "scan-earn-operation")}
            <input type="hidden" name="operationId" value={randomUUID()} />
            <input type="hidden" name="operationOrigin" value="SCAN" />
            <ScanActionButton language={language}>{customer.business.loyaltyMode === "SALES_AMOUNT" ? copy.recordSale : customer.business.loyaltyMode === "VISITS" ? copy.addVisitAction : copy.addPointsAction(customer.business.earnAmount)}</ScanActionButton>
          </form>
        </Card> : null}

        {customer.rewardUnlocks.length ? <section aria-label={copy.availableRewards}>
          <SectionHeader title={copy.availableRewards} />
          <div className="mt-4 space-y-4">{customer.rewardUnlocks.map((unlock) => {
            const redeemAction = redeemRewardAction.bind(null, slug, customer.id, unlock.reward.id);
            return <Card key={unlock.id} role="region" aria-labelledby={`scan-reward-${unlock.id}-title`} className="p-6">
              <p id={`scan-reward-${unlock.id}-title`} className="font-semibold text-foreground">{unlock.reward.name}</p>
              {unlock.reward.code ? <p className="mt-1 text-sm text-foreground-muted">{copy.rewardCode}: <span dir="ltr">{unlock.reward.code}</span></p> : null}
              {canRedeem ? <form action={redeemAction} className="mt-4">
                <input type="hidden" name="operationId" value={randomUUID()} />
                <input type="hidden" name="operationOrigin" value="SCAN" />
                {operationContextFields(!canRedeem, `scan-redeem-${unlock.id}`)}
                <ScanActionButton language={language}>{copy.redeemReward}</ScanActionButton>
              </form> : null}
            </Card>;
          })}</div>
        </section> : canRedeem ? <Inset className="mt-4 text-sm text-foreground-muted">{copy.noAvailableRewards}</Inset> : null}
        </section>

        <section aria-label={copy.activity}>
          <SectionHeader title={copy.activity} />
          {customer.transactions.length ? <div className="mt-4 space-y-4">{customer.transactions.map((transaction) => {
            const presentation = transactionPresentation(transaction.type);
            return <Inset key={transaction.id} className={presentation.color}>
              <p className="font-semibold text-foreground">{presentation.icon} {presentation.title}</p>
              <p className="mt-1 text-sm text-foreground-muted">{transaction.note ?? copy.loyaltyOperation}</p>
              <p className="mt-1 font-semibold text-foreground">{transaction.amount} {customer.business.unitName}</p>
              {transaction.createdBy?.email ? <p className="mt-1 text-xs font-semibold text-foreground-subtle">{copy.by}: {transaction.createdBy.email}</p> : null}
              <p className="mt-1 text-xs text-foreground-subtle">{dateFormatter.format(transaction.createdAt)}</p>
            </Inset>;
          })}</div> : <Inset className="mt-4 text-sm text-foreground-muted">{copy.noActivity}</Inset>}
        </section>

        <nav aria-label={copy.scan} className="grid gap-4 pb-4 sm:grid-cols-2">
          <Link href={`/businesses/${slug}/scan`} className="inline-flex min-h-12 items-center justify-center rounded-[var(--lf-radius-input)] bg-primary px-6 text-center font-semibold text-white hover:bg-primary-hover">{copy.scanNext}</Link>
          <Link href={`/businesses/${slug}/customers/${customer.id}`} className="inline-flex min-h-12 items-center justify-center rounded-[var(--lf-radius-input)] border border-border-strong bg-surface px-6 text-center font-semibold text-foreground-muted hover:bg-surface-subtle">{copy.openFullProfile}</Link>
        </nav>
        </>}
      </PageContainer>
    </main>
  );
}
