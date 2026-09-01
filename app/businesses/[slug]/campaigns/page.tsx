import {
  ClipboardCheck,
  MessageCircle,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import CampaignBuilder from "@/components/campaign-builder";
import { GrowthShell } from "@/components/growth/growth-shell";
import { getRequestBaseUrl } from "@/lib/app-url";
import { parseSelectedExportIds } from "@/lib/customers/bulk";
import { getCustomerSegment } from "@/lib/customers/segments";
import { hasFeatureEntitlement } from "@/lib/entitlements";
import {
  getExperienceModeCookieName,
  resolveExperienceMode,
} from "@/lib/experience-mode";
import { normalizeLanguage } from "@/lib/i18n";
import { canManageBusiness } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { getRewardAvailability } from "@/lib/rewards/availability";
import { DEFAULT_WHATSAPP_TEMPLATES } from "@/lib/whatsapp-templates";

type CampaignsPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ selected?: string }>;
};

export default async function CampaignsPage({
  params,
  searchParams,
}: CampaignsPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { slug } = await params;
  const [user, business] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { language: true, role: true, experienceAccess: true },
    }),
    prisma.business.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        loyaltyMode: true,
        unitName: true,
        rewardName: true,
        rewardThreshold: true,
        earnAmount: true,
        whatsappWelcomeMessage: true,
        whatsappBalanceMessage: true,
        whatsappRewardMessage: true,
        plan: true,
        rewards: {
          where: { isActive: true },
          select: { id: true, name: true, cost: true, isActive: true },
        },
      },
    }),
  ]);

  if (!business) notFound();
  if (!canManageBusiness(session.user, business.id)) {
    redirect(`/businesses/${slug}`);
  }
  if (!hasFeatureEntitlement(business.plan, "CAMPAIGNS")) {
    redirect(`/businesses/${slug}?error=plan-feature`);
  }

  const language = normalizeLanguage(user?.language);
  const experienceMode = resolveExperienceMode(
    (await cookies()).get(getExperienceModeCookieName(session.user.id))?.value,
    user?.role ?? session.user.role,
    user?.experienceAccess,
  );
  const query = await searchParams;
  const selectedIds = parseSelectedExportIds(query.selected ?? null);

  if (query.selected && !selectedIds) {
    redirect(`/businesses/${slug}/customers?bulk=invalid&selected=0&changed=0`);
  }

  if (selectedIds) {
    const selectedCount = await prisma.customer.count({
      where: { businessId: business.id, id: { in: selectedIds } },
    });
    if (selectedCount !== selectedIds.length) {
      redirect(
        `/businesses/${slug}/customers?bulk=invalid-selection&selected=${selectedIds.length}&changed=0`,
      );
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
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      balance: true,
      publicToken: true,
      isActive: true,
      createdAt: true,
      lifetimeEarned: true,
      transactions: {
        select: { createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  const baseUrl = await getRequestBaseUrl();
  const candidates = customers.map((customer) => {
    const progress = getRewardAvailability({
      customerActive: customer.isActive,
      balance: customer.balance,
      rewardThreshold: business.rewardThreshold,
      fallbackReward: {
        name: business.rewardName,
        cost: business.rewardThreshold,
      },
      catalogueRewards: business.rewards,
    });
    return {
      id: customer.id,
      name: [customer.firstName, customer.lastName].filter(Boolean).join(" "),
      phone: customer.phone,
      balance: customer.balance,
      remaining: progress.remaining,
      cardLink: `${baseUrl}/card/${customer.publicToken}`,
      segment: getCustomerSegment(
        {
          isActive: customer.isActive,
          createdAt: customer.createdAt,
          lastActivityAt: customer.transactions[0]?.createdAt ?? null,
          lifetimeEarned: customer.lifetimeEarned,
          rewardThreshold: business.rewardThreshold,
        },
        now,
      ),
      rewardReady: progress.rewardReady,
      oneAway:
        customer.isActive &&
        !progress.rewardReady &&
        progress.remaining <= business.earnAmount,
    };
  });

  return (
    <GrowthShell
      slug={business.slug}
      businessName={business.name}
      area="campaigns"
      language={language}
      experienceMode={experienceMode}
      title={language === "AR" ? "تحضير الحملات" : "Campaign preparation"}
      description={
        language === "AR"
          ? "اختر الجمهور، راجع كل مسودة، ثم انسخها أو افتحها يدويًا في WhatsApp."
          : "Choose an audience, review every draft, then copy it or open it manually in WhatsApp."
      }
    >
      <section
        data-campaign-workspace="true"
        className="overflow-hidden rounded-[var(--lf-radius-card)] border border-border bg-surface shadow-sm"
      >
        <div className="grid lg:grid-cols-[1.25fr_0.75fr]">
          <div className="p-5 sm:p-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-bold text-primary">
              <MessageCircle className="size-4" aria-hidden="true" />
              {language === "AR" ? "مساحة التحضير" : "Preparation workspace"}
            </span>
            <h2 className="mt-4 text-xl font-black tracking-tight text-foreground sm:text-2xl">
              {language === "AR"
                ? "من الجمهور إلى مسودة جاهزة للمراجعة"
                : "From audience to review-ready draft"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground-muted">
              {language === "AR"
                ? "تاني يجهز محتوى مخصصًا لكل عميل، لكنه لا يحفظ حملة ولا يرسل رسالة ولا يعرض نتائج تسليم."
                : "Tanee prepares personalized copy for each customer, but it does not save a campaign, send messages, or report delivery results."}
            </p>
          </div>
          <div className="border-t border-border bg-surface-subtle p-5 lg:border-s lg:border-t-0 lg:p-6">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                <ShieldCheck className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="font-black text-foreground">
                  {language === "AR"
                    ? "مراجعة يدوية دائمًا"
                    : "Always manually reviewed"}
                </p>
                <p className="mt-1 text-sm leading-6 text-foreground-muted">
                  {language === "AR"
                    ? "أنت تختار العميل وتراجع النص قبل فتح WhatsApp."
                    : "You choose the customer and review the copy before opening WhatsApp."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-label={
          language === "AR"
            ? "خطوات تجهيز الحملة"
            : "Campaign preparation steps"
        }
        className="grid gap-3 sm:grid-cols-3"
      >
        <Step
          icon={Users}
          number="01"
          title={language === "AR" ? "اختر الجمهور" : "Choose audience"}
        />
        <Step
          icon={ClipboardCheck}
          number="02"
          title={language === "AR" ? "راجع المسودات" : "Review drafts"}
        />
        <Step
          icon={Send}
          number="03"
          title={language === "AR" ? "افتح يدويًا" : "Open manually"}
        />
      </section>

      {selectedIds ? (
        <p className="flex items-center gap-3 rounded-[var(--lf-radius-input)] border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-bold text-cyan-900">
          <Users className="size-5 shrink-0" aria-hidden="true" />
          {language === "AR"
            ? `هذه المعاينة مقصورة على ${selectedIds.length} عميل محدد. لا يتم حفظ أو إرسال أي حملة.`
            : `This preview is limited to ${selectedIds.length} selected customers. No campaign is saved or sent.`}
        </p>
      ) : null}

      <CampaignBuilder
        businessName={business.name}
        unitName={business.unitName}
        rewardName={business.rewardName}
        templates={{
          welcome:
            business.whatsappWelcomeMessage ??
            DEFAULT_WHATSAPP_TEMPLATES.welcome,
          balance:
            business.whatsappBalanceMessage ??
            DEFAULT_WHATSAPP_TEMPLATES.balance,
          reward:
            business.whatsappRewardMessage ?? DEFAULT_WHATSAPP_TEMPLATES.reward,
        }}
        candidates={candidates}
        language={language}
        simple={experienceMode === "SIMPLE"}
      />
    </GrowthShell>
  );
}

function Step({
  icon: Icon,
  number,
  title,
}: {
  icon: typeof Users;
  number: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--lf-radius-input)] border border-border bg-surface p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div>
        <p className="lf-type-numeric text-[11px] font-black tracking-[0.16em] text-primary">
          {number}
        </p>
        <p className="text-sm font-black text-foreground">{title}</p>
      </div>
    </div>
  );
}
