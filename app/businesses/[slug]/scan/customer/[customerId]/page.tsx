import { randomUUID } from "node:crypto";

import { auth } from "@/auth";
import ScanActionButton from "@/components/scan-action-button";
import LoyaltyOperationContextFields from "@/components/loyalty-operation-context-fields";
import { PageContainer, PageHeader, SectionHeader } from "@/components/page-layout";
import { Card, Inset } from "@/components/ui/surface";
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
import { getBusinessTheme } from "@/lib/theme";
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
  const theme = getBusinessTheme(business);
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
    ? { icon: "🎁", title: copy.redeemActivity, color: "bg-violet-50" }
    : type === "ADJUSTMENT"
      ? { icon: "⚙️", title: copy.adjustmentActivity, color: "bg-orange-50" }
      : { icon: "⭐", title: copy.earnActivity, color: "bg-emerald-50" };

  return (
    <main className="min-h-full py-6 sm:py-8" style={{ background: theme.backgroundColor, fontFamily: theme.fontFamily }}>
      <PageContainer variant="narrow" className="px-4 sm:px-6">
        <PageHeader
          eyebrow={customer.business.name}
          title={fullName || copy.customerCard}
          metadata={<span dir="ltr">{customer.phone}</span>}
          secondaryActions={<Link href={`/businesses/${slug}/scan`} className="inline-flex min-h-11 items-center rounded-md border border-border bg-surface px-4 text-sm font-semibold text-slate-700 hover:bg-surface-subtle">{copy.backToScanner}</Link>}
        />

        {successMessage ? <Card role="status" className="border-emerald-200 bg-emerald-50 p-5">
          <p className="lf-type-supporting font-semibold text-emerald-800">{successMessage}</p>
          <p className="mt-4 text-sm font-semibold text-emerald-800">{copy.updatedBalance}</p>
          <p className="mt-1 lf-type-display lf-type-numeric text-slate-950">{customer.balance} {customer.business.unitName}</p>
          <nav aria-label={copy.scan} className="mt-5 grid gap-3">
            <Link href={`/businesses/${slug}/scan`} className="inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-5 text-center font-semibold text-white hover:bg-primary-hover">{copy.scanNext}</Link>
            <Link href={scanCustomerPath} className="inline-flex min-h-12 items-center justify-center rounded-md border border-border-strong bg-surface px-5 text-center font-semibold text-slate-800 hover:bg-surface-subtle">{copy.performAnotherOperation}</Link>
            <Link href={`/businesses/${slug}/customers/${customer.id}`} className="inline-flex min-h-11 items-center justify-center rounded-md px-5 text-center text-sm font-semibold text-slate-700 hover:bg-white/60">{copy.openFullProfile}</Link>
          </nav>
        </Card> : <>
        {errorMessage ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 font-semibold text-red-800">{errorMessage}</div> : null}

        <Card className="p-5">
          <p className="lf-type-supporting font-semibold text-primary">{copy.balance}</p>
          <p className="mt-1 lf-type-display lf-type-numeric text-slate-950">{customer.balance} {customer.business.unitName}</p>
        </Card>

        <section aria-label={copy.operationWorkspace}>
        {canEarn ? <Card className="p-5">
          <p className="lf-type-supporting font-semibold text-slate-600">{copy.earnOperation}</p>
          <h2 className="mt-1 lf-type-section text-slate-950">{customer.business.loyaltyMode === "SALES_AMOUNT" ? copy.addSale : customer.business.loyaltyMode === "VISITS" ? copy.addVisit : copy.addPoints}</h2>
          <form action={earnAction} className="mt-4">
            {customer.business.loyaltyMode === "SALES_AMOUNT" ? <input name="saleAmount" type="number" inputMode="decimal" placeholder={copy.saleAmountPlaceholder} aria-label={copy.saleAmountPlaceholder} className="mb-3 min-h-12 w-full rounded-md border border-border bg-surface px-4 font-semibold" /> : null}
            {operationContextFields(!canEarn, "scan-earn-operation")}
            <input type="hidden" name="operationId" value={randomUUID()} />
            <input type="hidden" name="operationOrigin" value="SCAN" />
            <ScanActionButton language={language}>{customer.business.loyaltyMode === "SALES_AMOUNT" ? copy.recordSale : customer.business.loyaltyMode === "VISITS" ? copy.addVisitAction : copy.addPointsAction(customer.business.earnAmount)}</ScanActionButton>
          </form>
        </Card> : null}

        {customer.rewardUnlocks.length ? <section aria-label={copy.availableRewards}>
          <SectionHeader title={copy.availableRewards} />
          <div className="mt-3 space-y-3">{customer.rewardUnlocks.map((unlock) => {
            const redeemAction = redeemRewardAction.bind(null, slug, customer.id, unlock.reward.id);
            return <Card key={unlock.id} className="p-5">
              <p className="font-semibold text-slate-950">{unlock.reward.name}</p>
              {unlock.reward.code ? <p className="mt-1 text-sm text-slate-600">{copy.rewardCode}: <span dir="ltr">{unlock.reward.code}</span></p> : null}
              {canRedeem ? <form action={redeemAction} className="mt-4">
                <input type="hidden" name="operationId" value={randomUUID()} />
                <input type="hidden" name="operationOrigin" value="SCAN" />
                {operationContextFields(!canRedeem, `scan-redeem-${unlock.id}`)}
                <ScanActionButton language={language}>{copy.redeemReward}</ScanActionButton>
              </form> : null}
            </Card>;
          })}</div>
        </section> : canRedeem ? <Inset className="mt-3 text-sm text-slate-600">{copy.noAvailableRewards}</Inset> : null}
        </section>

        <section aria-label={copy.activity}>
          <SectionHeader title={copy.activity} />
          {customer.transactions.length ? <div className="mt-3 space-y-3">{customer.transactions.map((transaction) => {
            const presentation = transactionPresentation(transaction.type);
            return <Inset key={transaction.id} className={presentation.color}>
              <p className="font-semibold text-slate-900">{presentation.icon} {presentation.title}</p>
              <p className="mt-1 text-sm text-slate-700">{transaction.note ?? copy.loyaltyOperation}</p>
              <p className="mt-1 font-semibold text-slate-900">{transaction.amount} {customer.business.unitName}</p>
              {transaction.createdBy?.email ? <p className="mt-1 text-xs font-semibold text-slate-500">{copy.by}: {transaction.createdBy.email}</p> : null}
              <p className="mt-1 text-xs text-slate-500">{dateFormatter.format(transaction.createdAt)}</p>
            </Inset>;
          })}</div> : <Inset className="mt-3 text-sm text-slate-600">{copy.noActivity}</Inset>}
        </section>

        <nav aria-label={copy.scan} className="grid gap-3 pb-4 sm:grid-cols-2">
          <Link href={`/businesses/${slug}/scan`} className="inline-flex min-h-12 items-center justify-center rounded-md bg-primary px-5 text-center font-semibold text-white hover:bg-primary-hover">{copy.scanNext}</Link>
          <Link href={`/businesses/${slug}/customers/${customer.id}`} className="inline-flex min-h-12 items-center justify-center rounded-md border border-border-strong bg-surface px-5 text-center font-semibold text-slate-800 hover:bg-surface-subtle">{copy.openFullProfile}</Link>
        </nav>
        </>}
      </PageContainer>
    </main>
  );
}
