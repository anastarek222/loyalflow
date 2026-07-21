import { auth } from "@/auth";
import CampaignBuilder from "@/components/campaign-builder";
import { getRequestBaseUrl } from "@/lib/app-url";
import { getCustomerSegment } from "@/lib/customers/segments";
import { parseSelectedExportIds } from "@/lib/customers/bulk";
import { calculateRewardProgress } from "@/lib/loyalty/progress";
import { canManageBusiness } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { DEFAULT_WHATSAPP_TEMPLATES } from "@/lib/whatsapp-templates";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type CampaignsPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ selected?: string }>;
};

export default async function CampaignsPage({ params, searchParams }: CampaignsPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { slug } = await params;
  const business = await prisma.business.findUnique({
    where: { slug },
    select: {
      id: true, slug: true, name: true, loyaltyMode: true, unitName: true,
      rewardName: true, rewardThreshold: true, earnAmount: true,
      whatsappWelcomeMessage: true, whatsappBalanceMessage: true, whatsappRewardMessage: true,
    },
  });
  if (!business) notFound();
  if (!canManageBusiness(session.user, business.id)) redirect(`/businesses/${slug}`);

  const query = await searchParams;
  const selectedIds = parseSelectedExportIds(query.selected ?? null);
  if (query.selected && !selectedIds) redirect(`/businesses/${slug}/customers?bulk=invalid&selected=0&changed=0`);

  if (selectedIds) {
    const selectedCount = await prisma.customer.count({
      where: { businessId: business.id, id: { in: selectedIds } },
    });
    if (selectedCount !== selectedIds.length) {
      redirect(`/businesses/${slug}/customers?bulk=invalid-selection&selected=${selectedIds.length}&changed=0`);
    }
  }

  const now = new Date();
  const customers = await prisma.customer.findMany({
    where: {
      businessId: business.id,
      ...(selectedIds ? { id: { in: selectedIds } } : {}),
    },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    take: 100,
    select: {
      id: true, firstName: true, lastName: true, phone: true, balance: true,
      publicToken: true, isActive: true, createdAt: true, lifetimeEarned: true,
      transactions: { select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  const baseUrl = await getRequestBaseUrl();
  const candidates = customers.map((customer) => {
    const progress = calculateRewardProgress(customer.balance, business.rewardThreshold, customer.isActive);
    return {
      id: customer.id,
      name: [customer.firstName, customer.lastName].filter(Boolean).join(" "),
      phone: customer.phone,
      balance: customer.balance,
      remaining: progress.remaining,
      cardLink: `${baseUrl}/card/${customer.publicToken}`,
      segment: getCustomerSegment({
        isActive: customer.isActive,
        createdAt: customer.createdAt,
        lastActivityAt: customer.transactions[0]?.createdAt ?? null,
        lifetimeEarned: customer.lifetimeEarned,
        rewardThreshold: business.rewardThreshold,
      }, now),
      rewardReady: progress.rewardAvailable,
      oneAway: customer.isActive && !progress.rewardAvailable && progress.remaining <= business.earnAmount,
    };
  });

  return (
    <main dir="rtl" className="min-h-screen bg-slate-100 px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link href={`/businesses/${business.slug}`} className="text-sm font-bold text-violet-700">← الرجوع إلى {business.name}</Link>
        <header className="mt-5 rounded-3xl bg-violet-700 p-6 text-white sm:p-8">
          <p className="text-sm font-bold text-white/75">حملات بسيطة</p>
          <h1 className="mt-2 text-3xl font-black">أنشئ معاينة حملة</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/90">اختر النوع والجمهور والعرض، ثم راجع كل رسالة قبل نسخها أو فتحها في WhatsApp. لا توجد رسائل تلقائية أو تكامل مدفوع.</p>
        </header>
        {selectedIds ? (
          <p className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-bold text-cyan-900">
            هذه المعاينة مقصورة على {selectedIds.length} عميل محدد من قائمة العملاء. لا يتم حفظ أو إرسال أي حملة.
          </p>
        ) : null}
        <CampaignBuilder
          businessName={business.name}
          unitName={business.unitName}
          rewardName={business.rewardName}
          templates={{
            welcome: business.whatsappWelcomeMessage ?? DEFAULT_WHATSAPP_TEMPLATES.welcome,
            balance: business.whatsappBalanceMessage ?? DEFAULT_WHATSAPP_TEMPLATES.balance,
            reward: business.whatsappRewardMessage ?? DEFAULT_WHATSAPP_TEMPLATES.reward,
          }}
          candidates={candidates}
        />
      </div>
    </main>
  );
}
