import { auth } from "@/auth";
import {
  businessPlaybookIds,
  businessPlaybooks,
  getBusinessPlaybook,
  getPlaybookBusinessUpdate,
  isBusinessConfiguredForPlaybook,
  type BusinessPlaybook,
  type PlaybookBusinessState,
} from "@/lib/playbooks/catalog";
import { canManageBusiness } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { applyBusinessPlaybookAction } from "./actions";
import { normalizeLanguage } from "@/lib/i18n";

type PlaybooksPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ playbook?: string; saved?: string; error?: string }>;
};

function stateFromBusiness(business: {
  loyaltyMode: PlaybookBusinessState["loyaltyMode"]; unitName: string; rewardName: string;
  rewardType: PlaybookBusinessState["rewardType"]; rewardDescription: string | null;
  rewardThreshold: number; earnAmount: number; loyaltyProgramName: string | null;
  pointsName: string | null; membershipName: string | null; rewardCode: string | null;
  welcomeMessage: string | null; whatsappWelcomeMessage: string | null;
  whatsappBalanceMessage: string | null; whatsappRewardMessage: string | null;
  _count: { customers: number; transactions: number; rewards: number; promotions: number; offers: number };
  activities: Array<{ id: string }>;
}): PlaybookBusinessState {
  return {
    loyaltyMode: business.loyaltyMode, unitName: business.unitName, rewardName: business.rewardName,
    rewardType: business.rewardType, rewardDescription: business.rewardDescription,
    rewardThreshold: business.rewardThreshold, earnAmount: business.earnAmount,
    loyaltyProgramName: business.loyaltyProgramName, pointsName: business.pointsName,
    membershipName: business.membershipName, rewardCode: business.rewardCode,
    welcomeMessage: business.welcomeMessage, whatsappWelcomeMessage: business.whatsappWelcomeMessage,
    whatsappBalanceMessage: business.whatsappBalanceMessage, whatsappRewardMessage: business.whatsappRewardMessage,
    businessSettingsActivityCount: business.activities.length, customerCount: business._count.customers,
    transactionCount: business._count.transactions, rewardCount: business._count.rewards,
    promotionCount: business._count.promotions, offerCount: business._count.offers,
  };
}

function loyaltyModeLabel(mode: string, language: "AR" | "EN") {
  if (language === "EN") return mode === "SALES_AMOUNT" ? "Sales amount" : mode === "POINTS" ? "Points" : "Visits";
  return mode === "SALES_AMOUNT" ? "قيمة المبيعات" : mode === "POINTS" ? "نقاط" : "زيارات";
}

function playbookName(playbook: BusinessPlaybook, language: "AR" | "EN") {
  return language === "AR" ? playbook.name : playbook.nameEn;
}

function playbookSummary(playbook: BusinessPlaybook, language: "AR" | "EN") {
  return language === "AR" ? playbook.summary : playbook.summaryEn;
}

function suggestion(
  language: "AR" | "EN",
  ar: string | undefined,
  en: string | undefined,
) {
  return language === "AR" ? ar : en;
}

export default async function PlaybooksPage({ params, searchParams }: PlaybooksPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { slug } = await params;
  const query = await searchParams;
  const business = await prisma.business.findUnique({
    where: { slug },
    select: {
        primaryColor: true,
        secondaryColor: true,
        themePreset: true,
        cardStyle: true,
        fontFamily: true,
      id: true, slug: true, name: true, loyaltyMode: true, unitName: true, rewardName: true,
      rewardType: true, rewardDescription: true, rewardThreshold: true, earnAmount: true,
      loyaltyProgramName: true, pointsName: true, membershipName: true, rewardCode: true,
      welcomeMessage: true, whatsappWelcomeMessage: true, whatsappBalanceMessage: true,
      whatsappRewardMessage: true,
      activities: { where: { type: "BUSINESS_SETTINGS_UPDATED" }, select: { id: true } },
      _count: { select: { customers: true, transactions: true, rewards: true, promotions: true, offers: true } },
    },
  });
  if (!business) notFound();
  if (!canManageBusiness(session.user, business.id)) redirect(`/businesses/${business.slug}`);
  const currentUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { language: true } });
  const language = normalizeLanguage(currentUser?.language);
  const t = (ar: string, en: string) => language === "AR" ? ar : en;
  const selected = getBusinessPlaybook(query.playbook) ?? businessPlaybooks.BARBER;
  const current = stateFromBusiness(business);
  const requiresConfirmation = isBusinessConfiguredForPlaybook(current);
  const update = getPlaybookBusinessUpdate(selected);
  const apply = applyBusinessPlaybookAction.bind(null, business.slug);
  const selectedName = playbookName(selected, language);
  const selectedSummary = playbookSummary(selected, language);

  return (
    <main className="min-h-screen px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-6xl" dir={language === "AR" ? "rtl" : "ltr"}>
        <Link href={`/businesses/${business.slug}/settings`} className="text-sm font-bold text-primary hover:text-primary">{t("← الرجوع إلى إعدادات", "← Back to settings for")} {business.name}</Link>
        <header className="mt-6">
          <p className="text-sm font-bold text-primary">{t("انطلاقة سريعة", "Quick start")}</p>
          <h1 className="mt-2 text-3xl font-black text-foreground">{t("قوالب تشغيل النشاط", "Business playbooks")}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-foreground-muted">{t("اختر قالبًا لمعاينة إعدادات عادية قابلة للتعديل. لا يُنشئ القالب مكافآت أو عروضًا أو Promotions أو رسائل أو أي خدمة مدفوعة تلقائيًا.", "Choose a playbook to preview editable standard settings. It does not automatically create rewards, offers, promotions, messages, or paid services.")}</p>
        </header>
        {query.saved === "1" ? <p className="mt-6 rounded-[var(--lf-radius-card)] border border-success/30 bg-success-subtle px-6 py-4 font-bold text-success">{t("تم تطبيق القالب. راجع الإعدادات وعدّلها كما تريد.", "Playbook applied. Review the settings and adjust them as needed.")}</p> : null}
        {query.saved === "already" ? <p className="mt-6 rounded-[var(--lf-radius-card)] border border-border bg-surface-subtle px-6 py-4 font-bold text-foreground-muted">{t("هذا القالب مطبق بالفعل؛ لم تُنشأ سجلات مكررة.", "This playbook is already applied; no duplicate records were created.")}</p> : null}
        {query.error === "confirmation" ? <p className="mt-6 rounded-[var(--lf-radius-card)] border border-warning/30 bg-warning-subtle px-6 py-4 font-bold text-warning">{t("النشاط يحتوي إعدادات أو بيانات قائمة. راجع التغييرات ثم أكّد الاستبدال صراحةً.", "This business already has settings or data. Review the changes and explicitly confirm replacement.")}</p> : null}
        {query.error === "invalid" ? <p className="mt-6 rounded-[var(--lf-radius-card)] border border-danger/30 bg-danger-subtle px-6 py-4 font-bold text-danger">{t("تعذر تحديد القالب.", "The playbook could not be identified.")}</p> : null}
        {query.error === "subscription-restricted" ? <p className="mt-6 rounded-[var(--lf-radius-card)] border border-danger/30 bg-danger-subtle px-6 py-4 font-bold text-danger">{t("لا يمكن تطبيق قالب تشغيل في حالة الاشتراك الحالية.", "A playbook cannot be applied in the current subscription state.")}</p> : null}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {businessPlaybookIds.map((id) => {
            const playbook = businessPlaybooks[id];
            return <Link key={id} href={`/businesses/${business.slug}/playbooks?playbook=${id}`} className={`rounded-[var(--lf-radius-card)] border p-6 shadow-sm transition hover:-translate-y-0.5 ${selected.id === id ? "border-primary/30 bg-primary-subtle" : "border-border bg-white"}`}><h2 className="font-black text-foreground">{playbookName(playbook, language)}</h2><p className="mt-2 text-sm leading-6 text-foreground-muted">{playbookSummary(playbook, language)}</p><span className="mt-4 inline-block text-sm font-bold text-primary">{t("معاينة القالب ←", "Preview playbook →")}</span></Link>;
          })}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <article className="rounded-[var(--lf-radius-card)] bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-foreground">{t("معاينة:", "Preview:")} {selectedName}</h2>
            <p className="mt-2 text-sm leading-6 text-foreground-muted">{selectedSummary}</p>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[var(--lf-radius-card)] bg-surface-subtle p-4"><dt className="text-xs font-bold text-foreground-subtle">{t("نظام الولاء", "Loyalty mode")}</dt><dd className="mt-1 font-black text-foreground">{loyaltyModeLabel(update.loyaltyMode, language)}</dd></div>
              <div className="rounded-[var(--lf-radius-card)] bg-surface-subtle p-4"><dt className="text-xs font-bold text-foreground-subtle">{t("المكافأة الافتراضية", "Default reward")}</dt><dd dir="auto" className="mt-1 font-black text-foreground">{update.rewardThreshold} {update.unitName} ← {update.rewardName}</dd></div>
              <div className="rounded-[var(--lf-radius-card)] bg-surface-subtle p-4"><dt className="text-xs font-bold text-foreground-subtle">{t("اسم البرنامج", "Programme name")}</dt><dd dir="auto" className="mt-1 font-black text-foreground">{update.loyaltyProgramName}</dd></div>
              <div className="rounded-[var(--lf-radius-card)] bg-surface-subtle p-4"><dt className="text-xs font-bold text-foreground-subtle">{t("وحدة الإضافة", "Earn unit")}</dt><dd dir="auto" className="mt-1 font-black text-foreground">{update.earnAmount} {update.unitName}</dd></div>
            </dl>
            <div className="mt-6 space-y-4 rounded-[var(--lf-radius-card)] border border-dashed border-border p-4 text-sm leading-6 text-foreground-muted">
              <p className="font-black text-foreground">{t("اقتراحات اختيارية — لا تُنشأ تلقائيًا", "Optional suggestions — never created automatically")}</p>
              {suggestion(language, selected.promotionSuggestion, selected.promotionSuggestionEn) ? <p>{t("ترقية:", "Promotion:")} {suggestion(language, selected.promotionSuggestion, selected.promotionSuggestionEn)}</p> : null}
              {suggestion(language, selected.offerSuggestion, selected.offerSuggestionEn) ? <p>{t("عرض:", "Offer:")} {suggestion(language, selected.offerSuggestion, selected.offerSuggestionEn)}</p> : null}
              {suggestion(language, selected.vipSuggestion, selected.vipSuggestionEn) ? <p>VIP: {suggestion(language, selected.vipSuggestion, selected.vipSuggestionEn)}</p> : null}
              {suggestion(language, selected.recoverySuggestion, selected.recoverySuggestionEn) ? <p>{t("استعادة العملاء:", "Recovery:")} {suggestion(language, selected.recoverySuggestion, selected.recoverySuggestionEn)}</p> : null}
              {suggestion(language, selected.campaignSuggestion, selected.campaignSuggestionEn) ? <p>{t("حملة:", "Campaign:")} {suggestion(language, selected.campaignSuggestion, selected.campaignSuggestionEn)}</p> : null}
            </div>
          </article>

          <form action={apply} className="h-fit rounded-[var(--lf-radius-card)] bg-white p-6 shadow-sm">
            <input type="hidden" name="playbook" value={selected.id} />
            <h2 className="text-xl font-black text-foreground">{t("تطبيق بعد المراجعة", "Apply after review")}</h2>
            <p className="mt-2 text-sm leading-6 text-foreground-muted">{t("سيتم تحديث إعدادات الولاء الافتراضية فقط وتسجيل نشاط تدقيق. الألوان والهوية والبيانات الحالية غير المذكورة أعلاه تبقى كما هي.", "Only the default loyalty settings will be updated and an audit activity recorded. Existing colours, branding, and data not listed above remain unchanged.")}</p>
            {requiresConfirmation ? <label className="mt-6 flex gap-4 rounded-[var(--lf-radius-card)] border border-warning/30 bg-warning-subtle p-4 text-sm leading-6 text-warning"><input name="confirmExisting" type="checkbox" className="mt-1" required /><span>{t("أفهم أن النشاط مهيأ أو يحتوي بيانات، وأريد استبدال إعدادات القالب الظاهرة فقط. لن تُحذف البيانات أو تُنشأ سجلات تلقائية.", "I understand this business is configured or contains data, and I want to replace only the displayed playbook settings. No data will be deleted and no records will be created automatically.")}</span></label> : <p className="mt-6 rounded-[var(--lf-radius-card)] bg-success-subtle p-4 text-sm font-bold text-success">{t("لا توجد إعدادات تشغيل أو بيانات سابقة تمنع تطبيق القالب.", "There are no existing operating settings or data preventing this playbook from being applied.")}</p>}
            <button type="submit" className="mt-6 w-full rounded-[var(--lf-radius-input)] bg-primary px-6 py-4 font-black text-[var(--lf-primary-foreground)] hover:bg-primary-subtle">{t("تطبيق", "Apply")} {selectedName}</button>
          </form>
        </section>
      </div>
    </main>
  );
}
