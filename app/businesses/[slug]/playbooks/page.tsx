import { auth } from "@/auth";
import {
  businessPlaybookIds,
  businessPlaybooks,
  getBusinessPlaybook,
  getPlaybookBusinessUpdate,
  isBusinessConfiguredForPlaybook,
  type PlaybookBusinessState,
} from "@/lib/playbooks/catalog";
import { canManageBusiness } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { applyBusinessPlaybookAction } from "./actions";
import { getBusinessTheme } from "@/lib/theme";
import { AdministrationNavigation } from "@/components/administration/administration-navigation";
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

function loyaltyModeLabel(mode: string) {
  return mode === "SALES_AMOUNT" ? "قيمة المبيعات" : mode === "POINTS" ? "نقاط" : "زيارات";
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

  const theme = getBusinessTheme(business);
  if (!canManageBusiness(session.user, business.id)) redirect(`/businesses/${business.slug}`);
  const currentUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { language: true } });
  const language = normalizeLanguage(currentUser?.language);
  const selected = getBusinessPlaybook(query.playbook) ?? businessPlaybooks.BARBER;
  const current = stateFromBusiness(business);
  const requiresConfirmation = isBusinessConfiguredForPlaybook(current);
  const update = getPlaybookBusinessUpdate(selected);
  const apply = applyBusinessPlaybookAction.bind(null, business.slug);

  return (
    <main style={{ background: theme.backgroundColor, fontFamily: theme.fontFamily }} className="min-h-screen px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <AdministrationNavigation user={session.user} businessId={business.id} slug={business.slug} active="playbooks" language={language} />
        <Link href={`/businesses/${business.slug}/settings`} className="text-sm font-bold text-violet-700 hover:text-violet-900">← الرجوع إلى إعدادات {business.name}</Link>
        <header className="mt-5 rounded-3xl p-6 text-white shadow-xl sm:p-8"
          style={{ backgroundColor: theme.primaryColor }}>
          <p className="text-sm font-bold text-white/75">انطلاقة سريعة</p>
          <h1 className="mt-2 text-3xl font-black">قوالب تشغيل النشاط</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/90">اختر قالبًا لمعاينة إعدادات عادية قابلة للتعديل. لا يُنشئ القالب مكافآت أو عروضًا أو Promotions أو رسائل أو أي خدمة مدفوعة تلقائيًا.</p>
        </header>
        {query.saved === "1" ? <p className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 font-bold text-emerald-800">تم تطبيق القالب. راجع الإعدادات وعدّلها كما تريد.</p> : null}
        {query.saved === "already" ? <p className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 font-bold text-slate-700">هذا القالب مطبق بالفعل؛ لم تُنشأ سجلات مكررة.</p> : null}
        {query.error === "confirmation" ? <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 font-bold text-amber-900">النشاط يحتوي إعدادات أو بيانات قائمة. راجع التغييرات ثم أكّد الاستبدال صراحةً.</p> : null}
        {query.error === "invalid" ? <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 font-bold text-red-800">تعذر تحديد القالب.</p> : null}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {businessPlaybookIds.map((id) => {
            const playbook = businessPlaybooks[id];
            return <Link key={id} href={`/businesses/${business.slug}/playbooks?playbook=${id}`} className={`rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 ${selected.id === id ? "border-violet-500 bg-violet-50" : "border-slate-200 bg-white"}`}><h2 className="font-black text-slate-950">{playbook.name}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{playbook.summary}</p><span className="mt-4 inline-block text-sm font-bold text-violet-700">معاينة القالب ←</span></Link>;
          })}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <article className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-black text-slate-950">معاينة: {selected.name}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{selected.summary}</p>
            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4"><dt className="text-xs font-bold text-slate-500">نظام الولاء</dt><dd className="mt-1 font-black text-slate-950">{loyaltyModeLabel(update.loyaltyMode)}</dd></div>
              <div className="rounded-2xl bg-slate-50 p-4"><dt className="text-xs font-bold text-slate-500">المكافأة الافتراضية</dt><dd className="mt-1 font-black text-slate-950">{update.rewardThreshold} {update.unitName} ← {update.rewardName}</dd></div>
              <div className="rounded-2xl bg-slate-50 p-4"><dt className="text-xs font-bold text-slate-500">اسم البرنامج</dt><dd className="mt-1 font-black text-slate-950">{update.loyaltyProgramName}</dd></div>
              <div className="rounded-2xl bg-slate-50 p-4"><dt className="text-xs font-bold text-slate-500">وحدة الإضافة</dt><dd className="mt-1 font-black text-slate-950">{update.earnAmount} {update.unitName}</dd></div>
            </dl>
            <div className="mt-6 space-y-3 rounded-2xl border border-dashed border-slate-300 p-4 text-sm leading-6 text-slate-600">
              <p className="font-black text-slate-900">اقتراحات اختيارية — لا تُنشأ تلقائيًا</p>
              {selected.promotionSuggestion ? <p>Promotion: {selected.promotionSuggestion}</p> : null}
              {selected.offerSuggestion ? <p>Offer: {selected.offerSuggestion}</p> : null}
              {selected.vipSuggestion ? <p>VIP: {selected.vipSuggestion}</p> : null}
              {selected.recoverySuggestion ? <p>استعادة العملاء: {selected.recoverySuggestion}</p> : null}
              {selected.campaignSuggestion ? <p>حملة: {selected.campaignSuggestion}</p> : null}
            </div>
          </article>

          <form action={apply} className="h-fit rounded-3xl bg-white p-6 shadow-sm">
            <input type="hidden" name="playbook" value={selected.id} />
            <h2 className="text-xl font-black text-slate-950">تطبيق بعد المراجعة</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">سيتم تحديث إعدادات الولاء الافتراضية فقط وتسجيل نشاط تدقيق. الألوان والهوية والبيانات الحالية غير المذكورة أعلاه تبقى كما هي.</p>
            {requiresConfirmation ? <label className="mt-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950"><input name="confirmExisting" type="checkbox" className="mt-1" required /><span>أفهم أن النشاط مهيأ أو يحتوي بيانات، وأريد استبدال إعدادات القالب الظاهرة فقط. لن تُحذف البيانات أو تُنشأ سجلات تلقائية.</span></label> : <p className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800">لا توجد إعدادات تشغيل أو بيانات سابقة تمنع تطبيق القالب.</p>}
            <button type="submit" className="mt-5 w-full rounded-xl bg-violet-600 px-5 py-3 font-black text-white hover:bg-violet-700">تطبيق {selected.name}</button>
          </form>
        </section>
      </div>
    </main>
  );
}
