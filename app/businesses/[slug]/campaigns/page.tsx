import { auth } from "@/auth";
import CampaignBuilder from "@/components/campaign-builder";
import { getRequestBaseUrl } from "@/lib/app-url";
import { getCustomerSegment } from "@/lib/customers/segments";
import { parseSelectedExportIds } from "@/lib/customers/bulk";
import { calculateRewardProgress } from "@/lib/loyalty/progress";
import { canManageBusiness } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { DEFAULT_WHATSAPP_TEMPLATES } from "@/lib/whatsapp-templates";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { GrowthShell } from "@/components/growth/growth-shell";
import { getExperienceModeCookieName, resolveExperienceMode } from "@/lib/experience-mode";
import { normalizeLanguage } from "@/lib/i18n";

type CampaignsPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ selected?: string }>;
};

export default async function CampaignsPage({ params, searchParams }: CampaignsPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { slug } = await params;
  const [user, business] = await Promise.all([prisma.user.findUnique({ where: { id: session.user.id }, select: { language: true, role: true, experienceAccess: true } }), prisma.business.findUnique({
    where: { slug },
    select: {
      id: true, slug: true, name: true, loyaltyMode: true, unitName: true,
      rewardName: true, rewardThreshold: true, earnAmount: true,
      whatsappWelcomeMessage: true, whatsappBalanceMessage: true, whatsappRewardMessage: true,
    },
  })]);
  if (!business) notFound();
  if (!canManageBusiness(session.user, business.id)) redirect(`/businesses/${slug}`);
  const language = normalizeLanguage(user?.language);
  const experienceMode = resolveExperienceMode((await cookies()).get(getExperienceModeCookieName(session.user.id))?.value, user?.role ?? session.user.role, user?.experienceAccess);

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
    <GrowthShell slug={business.slug} businessName={business.name} area="campaigns" language={language} experienceMode={experienceMode} title={language === "AR" ? "تحضير الحملات" : "Campaign preparation"} description={language === "AR" ? "اختر الجمهور وراجع المسودات. لا توجد خدمة إرسال أو نتائج تسليم في LoyalFlow." : "Select an audience and review drafts. LoyalFlow has no delivery service or delivery results."}>
        {selectedIds ? (
          <p className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-bold text-cyan-900">
            {language === "AR" ? `هذه المعاينة مقصورة على ${selectedIds.length} عميل محدد. لا يتم حفظ أو إرسال أي حملة.` : `This preview is limited to ${selectedIds.length} selected customers. No campaign is saved or sent.`}
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
          language={language}
          simple={experienceMode === "SIMPLE"}
        />
    </GrowthShell>
  );
}
