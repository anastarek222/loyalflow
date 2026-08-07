import { auth } from "@/auth";
import { normalizeLanguage } from "@/lib/i18n";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import RedemptionReversalPanel from "../redemption-reversal-panel";

type RedemptionReversalPageProps = {
  params: Promise<{ slug: string; customerId: string }>;
};

export default async function RedemptionReversalPage({
  params,
}: RedemptionReversalPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { slug, customerId } = await params;

  const [user, business] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { language: true },
    }),
    prisma.business.findUnique({
      where: { slug },
      select: { id: true, slug: true, name: true, unitName: true, currency: true },
    }),
  ]);

  if (!business) notFound();

  const actorAllowed =
    session.user.role === "SUPER_ADMIN" ||
    (session.user.role === "OWNER" && session.user.businessId === business.id);

  if (!actorAllowed) {
    redirect(`/businesses/${slug}/customers/${customerId}`);
  }

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, businessId: business.id, isActive: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      balance: true,
      rewardRedemptions: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          rewardName: true,
          cost: true,
          createdAt: true,
          transactionId: true,
          transaction: {
            select: {
              id: true,
              type: true,
              sourceLoyaltyMode: true,
              reversals: {
                where: { type: "REVERSAL", reversalKind: "REDEMPTION_REVERSAL" },
                select: { id: true },
              },
            },
          },
        },
      },
    },
  });

  if (!customer) notFound();

  const language = normalizeLanguage(user?.language);
  const customerName = [customer.firstName, customer.lastName].filter(Boolean).join(" ");

  return (
    <main className="min-h-screen bg-surface-subtle px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href={`/businesses/${business.slug}/customers/${customer.id}`}
          className="text-sm font-semibold text-primary hover:text-primary-hover"
        >
          {language === "AR" ? "العودة إلى العميل" : "Back to customer"}
        </Link>

        <header className="mt-6 rounded-[var(--lf-radius-card)] border border-border bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-foreground-subtle">{business.name}</p>
          <h1 dir="auto" className="mt-2 text-2xl font-black text-foreground sm:text-3xl">
            {language === "AR" ? "عكس استبدال مكافأة" : "Reverse a reward redemption"}
          </h1>
          <p dir="auto" className="mt-2 text-sm text-foreground-muted">
            {customerName} · {language === "AR" ? "الرصيد الحالي" : "Current balance"}: {customer.balance}
          </p>
        </header>

        <RedemptionReversalPanel
          businessSlug={business.slug}
          customerId={customer.id}
          language={language}
          unitName={business.unitName}
          currency={business.currency}
          redemptions={customer.rewardRedemptions}
        />
      </div>
    </main>
  );
}
