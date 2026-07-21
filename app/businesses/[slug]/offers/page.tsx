import { auth } from "@/auth";
import { customerSegments, getCustomerSegmentLabel } from "@/lib/customers/segments";
import { isOfferCurrentlyValid } from "@/lib/offers/eligibility";
import { canAccessBusiness, canManageBusiness } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createOfferAction, toggleOfferStatusAction, updateOfferAction } from "./actions";

type OffersPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
};

function getEligibilityLabel(eligibility: string, segment: string | null) {
  if (eligibility === "VIP") return "عملاء VIP فقط";
  if (eligibility === "SEGMENT" && segment) return `شريحة: ${getCustomerSegmentLabel(segment as typeof customerSegments[number])}`;
  return "كل العملاء النشطين";
}

function formatDate(value: Date | null) {
  return value ? new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeZone: "Africa/Cairo" }).format(value) : "بدون تاريخ";
}

export default async function OffersPage({ params, searchParams }: OffersPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { slug } = await params;
  const query = await searchParams;
  const business = await prisma.business.findUnique({
    where: { slug },
    select: {
      id: true, slug: true, name: true, primaryColor: true,
      offers: { orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }] },
    },
  });
  if (!business) notFound();
  if (!canAccessBusiness(session.user, business.id)) redirect("/dashboard");
  const canManageOffers = canManageBusiness(session.user, business.id);
  const now = new Date();
  const createOffer = createOfferAction.bind(null, business.slug);

  return (
    <main dir="rtl" className="min-h-screen bg-slate-100 px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <Link href={`/businesses/${business.slug}`} className="text-sm font-bold text-violet-700 hover:text-violet-900">← الرجوع إلى {business.name}</Link>
        <header className="mt-5 rounded-3xl p-6 text-white shadow-xl sm:p-8" style={{ backgroundColor: business.primaryColor }}>
          <p className="text-sm font-bold text-white/75">عروض العملاء</p>
          <h1 className="mt-2 text-3xl font-black">عروض {business.name}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/85">العرض حافز ظاهر للعميل عند استحقاقه. لا يضيف رصيدًا ولا يغيّر نقاط الولاء أو المكافآت أو الحملات.</p>
        </header>

        {query.success ? <p className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 font-bold text-emerald-800">تم حفظ العرض.</p> : null}
        {query.error ? <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 font-bold text-red-800">تعذر حفظ العرض. راجع الاسم والتواريخ والجمهور.</p> : null}

        <section className={`mt-6 grid gap-6 ${canManageOffers ? "lg:grid-cols-[380px_1fr]" : ""}`}>
          {canManageOffers ? (
            <form action={createOffer} className="h-fit rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black text-slate-950">إضافة عرض</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">تُفسَّر التواريخ كتقويم UTC كامل لضمان بدء ونهاية ثابتين؛ تاريخ النهاية يشمل اليوم كله.</p>
              <div className="mt-6 space-y-4">
                <label className="block text-sm font-bold text-slate-700">اسم العرض<input name="name" required minLength={2} maxLength={100} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950" /></label>
                <label className="block text-sm font-bold text-slate-700">الوصف <span className="font-normal text-slate-400">(اختياري)</span><textarea name="description" rows={3} maxLength={500} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950" /></label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-bold text-slate-700">يبدأ في <input name="validFrom" type="date" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950" /></label>
                  <label className="block text-sm font-bold text-slate-700">ينتهي في <input name="validUntil" type="date" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950" /></label>
                </div>
                <label className="block text-sm font-bold text-slate-700">الجمهور<select name="eligibility" defaultValue="ALL" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950"><option value="ALL">كل العملاء النشطين</option><option value="VIP">عملاء VIP فقط</option><option value="SEGMENT">شريحة محددة</option></select></label>
                <label className="block text-sm font-bold text-slate-700">الشريحة <span className="font-normal text-slate-400">(لعرض الشريحة فقط)</span><select name="segment" defaultValue="" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950"><option value="">اختر شريحة</option>{customerSegments.map((segment) => <option key={segment} value={segment}>{getCustomerSegmentLabel(segment)}</option>)}</select></label>
                <button type="submit" className="w-full rounded-xl bg-violet-600 px-5 py-3 font-black text-white hover:bg-violet-700">إضافة عرض</button>
              </div>
            </form>
          ) : null}

          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-black text-slate-950">كل العروض</h2><p className="mt-1 text-sm text-slate-500">تظهر البطاقة العامة العروض النشطة والصالحة والمؤهلة فقط، دون كشف قواعد الجمهور الداخلية.</p></div>{!canManageOffers ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">عرض فقط</span> : null}</div>
            <div className="mt-5 space-y-4">
              {business.offers.length === 0 ? <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">لا توجد عروض مضافة بعد.</p> : business.offers.map((offer) => {
                const activeNow = isOfferCurrentlyValid(offer, now);
                const toggleOffer = toggleOfferStatusAction.bind(null, business.slug, offer.id, !offer.isActive);
                const updateOffer = updateOfferAction.bind(null, business.slug, offer.id);
                return <article key={offer.id} className="rounded-2xl border border-slate-200 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-black text-slate-950">{offer.name}</p><p className="mt-1 text-sm text-slate-500">{getEligibilityLabel(offer.eligibility, offer.segment)}</p><p className="mt-1 text-xs text-slate-500">من {formatDate(offer.validFrom)} إلى {formatDate(offer.validUntil)}</p>{offer.description ? <p className="mt-2 text-sm leading-6 text-slate-600">{offer.description}</p> : null}</div><div className="flex items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-black ${activeNow ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{activeNow ? "نشط الآن" : "غير متاح الآن"}</span>{canManageOffers ? <form action={toggleOffer}><button type="submit" className={`rounded-xl px-4 py-2 text-sm font-black ${offer.isActive ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>{offer.isActive ? "إيقاف" : "تفعيل"}</button></form> : null}</div></div>
                  {canManageOffers ? <details className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4"><summary className="cursor-pointer font-black text-violet-700">تعديل العرض أو معاينته</summary><p className="mt-3 text-sm text-slate-600">المعاينة: {activeNow ? "سيُعرض فقط للعملاء المطابقين لهذا الجمهور." : "لن يظهر لأي عميل حاليًا."}</p><form action={updateOffer} className="mt-5 grid gap-4 sm:grid-cols-2"><label className="block text-sm font-bold text-slate-700">الاسم<input name="name" required minLength={2} maxLength={100} defaultValue={offer.name} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950" /></label><label className="block text-sm font-bold text-slate-700">الجمهور<select name="eligibility" defaultValue={offer.eligibility} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950"><option value="ALL">كل العملاء النشطين</option><option value="VIP">عملاء VIP فقط</option><option value="SEGMENT">شريحة محددة</option></select></label><label className="block text-sm font-bold text-slate-700">يبدأ في<input name="validFrom" type="date" defaultValue={offer.validFrom?.toISOString().slice(0, 10) ?? ""} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950" /></label><label className="block text-sm font-bold text-slate-700">ينتهي في<input name="validUntil" type="date" defaultValue={offer.validUntil?.toISOString().slice(0, 10) ?? ""} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950" /></label><label className="block text-sm font-bold text-slate-700">الشريحة<select name="segment" defaultValue={offer.segment ?? ""} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950"><option value="">اختر شريحة</option>{customerSegments.map((segment) => <option key={segment} value={segment}>{getCustomerSegmentLabel(segment)}</option>)}</select></label><label className="block text-sm font-bold text-slate-700 sm:col-span-2">الوصف<textarea name="description" rows={3} maxLength={500} defaultValue={offer.description ?? ""} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950" /></label><button type="submit" className="rounded-xl bg-violet-600 px-5 py-3 font-black text-white hover:bg-violet-700 sm:col-span-2">حفظ التعديلات</button></form></details> : null}
                </article>;
              })}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
