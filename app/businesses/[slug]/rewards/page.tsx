import { auth } from "@/auth";
import { canManageBusiness } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { getBusinessTheme } from "@/lib/theme";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  createRewardAction,
  toggleRewardStatusAction,
  updateRewardAction,
} from "./actions";

type RewardsPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
};

function getRewardTypeLabel(type: string) {
  switch (type) {
    case "PROMO_CODE":
      return "كود ترويجي";
    case "DISCOUNT":
      return "خصم";
    case "CUSTOM":
      return "مكافأة مخصصة";
    default:
      return "هدية";
  }
}

export default async function RewardsPage({
  params,
  searchParams,
}: RewardsPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { slug } = await params;
  const query = await searchParams;
  const business = await prisma.business.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      primaryColor: true,
      secondaryColor: true,
      themePreset: true,
      cardStyle: true,
      fontFamily: true,
      unitName: true,
      rewardName: true,
      rewardThreshold: true,
      rewards: {
        orderBy: [{ isActive: "desc" }, { cost: "asc" }],
      },
    },
  });

  if (!business) {
    notFound();
  }

  const theme =
    getBusinessTheme(business);

  if (!canManageBusiness(session.user, business.id)) {
    redirect(`/businesses/${business.slug}`);
  }

  const createReward = createRewardAction.bind(null, business.slug);

  return (
    <main
      dir="rtl"
      className="min-h-screen px-4 py-6 sm:px-8 sm:py-8"
      style={{
        backgroundColor: theme.backgroundColor,
        fontFamily: theme.fontFamily,
      }}
    >
      <div className="mx-auto max-w-6xl">
        <Link
          href={`/businesses/${business.slug}/settings`}
          className="text-sm font-bold text-violet-700 hover:text-violet-900"
        >
          ← الرجوع إلى إعدادات {business.name}
        </Link>

        <header
          className={`mt-5 border p-6 text-white sm:p-8 ${theme.cardClass} ${theme.borderClass}`}
          style={{
            backgroundColor: theme.primaryColor,
          }}
        >
          <p className="text-sm font-bold text-white/75">كتالوج المكافآت</p>
          <h1 className="mt-2 text-3xl font-black">مكافآت {business.name}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85">
            أضف مكافآت متعددة، فعّل ما تريد ظهوره للموظفين، واحتفظ بالمكافأة
            الحالية كخيار احتياطي حتى تبدأ في استخدام الكتالوج.
          </p>
        </header>

        {query.success ? (
          <p className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 font-bold text-emerald-800">
            تم حفظ كتالوج المكافآت.
          </p>
        ) : null}

        {query.error ? (
          <p className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 font-bold text-red-800">
            تعذر حفظ المكافأة. راجع البيانات ثم حاول مرة أخرى.
          </p>
        ) : null}

        <section className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
          <form
            action={createReward}
            className={`h-fit border bg-white p-6 ${theme.cardClass} ${theme.borderClass}`}
          >
            <h2 className="text-xl font-black text-slate-950">إضافة مكافأة</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              تكلفة المكافأة تُخصم من رصيد العميل عند تأكيد الاستبدال.
            </p>

            <div className="mt-6 space-y-4">
              <label className="block text-sm font-bold text-slate-700">
                اسم المكافأة
                <input name="name" required minLength={2} maxLength={100} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950" />
              </label>

              <label className="block text-sm font-bold text-slate-700">
                التكلفة ({business.unitName})
                <input name="cost" type="number" required min={1} max={1000000} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950" />
              </label>

              <label className="block text-sm font-bold text-slate-700">
                صلاحية المكافأة بعد فتحها بالأيام <span className="font-normal text-slate-400">(اختياري)</span>
                <input name="expiresAfterDays" type="number" min={1} max={3650} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950" />
              </label>

              <label className="block text-sm font-bold text-slate-700">
                النوع
                <select name="type" defaultValue="GIFT" className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950">
                  <option value="GIFT">هدية</option>
                  <option value="PROMO_CODE">كود ترويجي</option>
                  <option value="DISCOUNT">خصم</option>
                  <option value="CUSTOM">مكافأة مخصصة</option>
                </select>
              </label>

              <label className="block text-sm font-bold text-slate-700">
                الكود <span className="font-normal text-slate-400">(اختياري)</span>
                <input name="code" maxLength={100} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950" />
              </label>

              <label className="block text-sm font-bold text-slate-700">
                الوصف <span className="font-normal text-slate-400">(اختياري)</span>
                <textarea name="description" rows={3} maxLength={300} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-950" />
              </label>

              <button type="submit" className="w-full rounded-xl bg-violet-600 px-5 py-3 font-black text-white hover:bg-violet-700">
                إضافة مكافأة
              </button>
            </div>
          </form>

          <section className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">المكافآت المتاحة</h2>
            <p className="mt-1 text-sm text-slate-500">
              إذا لم تضف أي مكافأة هنا، يستمر النظام في استخدام المكافأة القديمة تلقائيًا.
            </p>

            <article className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <p className="font-bold text-slate-900">الخيار الاحتياطي الحالي: {business.rewardName}</p>
              <p className="mt-1 text-sm text-slate-500">{business.rewardThreshold} {business.unitName}</p>
            </article>

            <div className="mt-5 space-y-4">
              {business.rewards.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">لا توجد مكافآت مضافة بعد.</p>
              ) : business.rewards.map((reward) => {
                const toggleReward = toggleRewardStatusAction.bind(null, business.slug, reward.id, !reward.isActive);
                const updateReward = updateRewardAction.bind(null, business.slug, reward.id);

                return (
                  <article key={reward.id} className="rounded-2xl border border-slate-200 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="font-black text-slate-950">{reward.name}</p>
                        <p className="mt-1 text-sm text-slate-500">{getRewardTypeLabel(reward.type)} · {reward.cost} {business.unitName}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {reward.expiresAfterDays
                            ? `تنتهي بعد ${reward.expiresAfterDays} يوم من فتحها`
                            : "لا تنتهي بعد الفتح"}
                        </p>
                        {reward.description ? <p className="mt-2 text-sm leading-6 text-slate-600">{reward.description}</p> : null}
                        {reward.code ? <p className="mt-2 text-sm font-bold text-violet-700">الكود: {reward.code}</p> : null}
                      </div>

                      <form action={toggleReward}>
                        <button type="submit" className={`rounded-xl px-4 py-2 text-sm font-black ${reward.isActive ? "bg-amber-100 text-amber-800 hover:bg-amber-200" : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"}`}>
                          {reward.isActive ? "إيقاف" : "تفعيل"}
                        </button>
                      </form>
                    </div>

                    <details className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <summary className="cursor-pointer font-black text-violet-700">
                        تعديل المكافأة
                      </summary>

                      <form action={updateReward} className="mt-5 grid gap-4 sm:grid-cols-2">
                        <label className="block text-sm font-bold text-slate-700">
                          الاسم
                          <input name="name" required minLength={2} maxLength={100} defaultValue={reward.name} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950" />
                        </label>

                        <label className="block text-sm font-bold text-slate-700">
                          التكلفة ({business.unitName})
                          <input name="cost" type="number" required min={1} max={1000000} defaultValue={reward.cost} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950" />
                        </label>

                        <label className="block text-sm font-bold text-slate-700">
                          الصلاحية بعد الفتح بالأيام <span className="font-normal text-slate-400">(اختياري)</span>
                          <input name="expiresAfterDays" type="number" min={1} max={3650} defaultValue={reward.expiresAfterDays ?? ""} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950" />
                        </label>

                        <label className="block text-sm font-bold text-slate-700">
                          النوع
                          <select name="type" defaultValue={reward.type} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950">
                            <option value="GIFT">هدية</option>
                            <option value="PROMO_CODE">كود ترويجي</option>
                            <option value="DISCOUNT">خصم</option>
                            <option value="CUSTOM">مكافأة مخصصة</option>
                          </select>
                        </label>

                        <label className="block text-sm font-bold text-slate-700">
                          الكود <span className="font-normal text-slate-400">(اختياري)</span>
                          <input name="code" maxLength={100} defaultValue={reward.code ?? ""} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950" />
                        </label>

                        <label className="block text-sm font-bold text-slate-700 sm:col-span-2">
                          الوصف <span className="font-normal text-slate-400">(اختياري)</span>
                          <textarea name="description" rows={3} maxLength={300} defaultValue={reward.description ?? ""} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950" />
                        </label>

                        <button type="submit" className="rounded-xl bg-violet-600 px-5 py-3 font-black text-white hover:bg-violet-700 sm:col-span-2">
                          حفظ التعديلات
                        </button>
                      </form>
                    </details>
                  </article>
                );
              })}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
