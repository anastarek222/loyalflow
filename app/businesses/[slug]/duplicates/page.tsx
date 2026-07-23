import { auth } from "@/auth";
import {
  findDuplicateCustomerGroups,
  getDuplicateReasonLabel,
  getReadOnlyMergePreview,
} from "@/lib/customers/duplicates";
import { canPerform } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getBusinessTheme } from "@/lib/theme";

type DuplicateReviewPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function DuplicateReviewPage({
  params,
}: DuplicateReviewPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { slug } = await params;
  const business = await prisma.business.findUnique({
    where: { slug },
    select: {
        primaryColor: true,
        secondaryColor: true,
        themePreset: true,
        cardStyle: true,
        fontFamily: true, id: true, slug: true, name: true, unitName: true },
  });
  if (!business) notFound();

  const theme = getBusinessTheme(business);

  if (!canPerform(session.user, business.id, "CUSTOMERS_EDIT")) {
    redirect(`/businesses/${slug}/customers`);
  }

  const customers = await prisma.customer.findMany({
    where: { businessId: business.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      businessId: true,
      firstName: true,
      lastName: true,
      phone: true,
      customerCode: true,
      balance: true,
      lifetimeEarned: true,
      lifetimeRedeemed: true,
      publicToken: true,
      createdAt: true,
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, type: true, amount: true, balanceAfter: true, createdAt: true },
      },
      redemptions: {
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, rewardName: true, cost: true, createdAt: true },
      },
      tagAssignments: {
        include: { tag: { select: { id: true, name: true } } },
      },
      notes: {
        orderBy: { updatedAt: "desc" },
        take: 3,
        select: { id: true, content: true, updatedAt: true },
      },
      referralsMade: {
        select: { id: true, createdAt: true },
      },
      referralsReceived: {
        select: { id: true, createdAt: true },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, type: true, description: true, createdAt: true },
      },
      _count: {
        select: {
          transactions: true,
          redemptions: true,
          notes: true,
          activities: true,
        },
      },
    },
  });

  const groups = findDuplicateCustomerGroups(customers);

  return (
    <main style={{ background: theme.backgroundColor, fontFamily: theme.fontFamily }} className="min-h-screen px-4 py-5 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href={`/businesses/${business.slug}/customers`}
          className="text-sm font-medium text-violet-600 hover:text-violet-800"
        >
          → الرجوع إلى العملاء
        </Link>

        <header className="mt-5 rounded-3xl p-6 text-white shadow-xl sm:p-8"
          style={{ backgroundColor: theme.primaryColor }}>
          <p className="text-sm font-bold text-cyan-300">مراجعة فقط</p>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">مراجعة العملاء المتشابهين</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            نعرض إشارات متطابقة داخل {business.name} فقط. لا يتم دمج أو حذف أي عميل، ولا تتغير الأرصدة أو الحركات أو البطاقات العامة من هذه الصفحة.
          </p>
        </header>

        <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-sm">
          <p className="font-black">الدمج غير مفعّل عمدًا</p>
          <p className="mt-1">
            يلزم قرار أعمال وسياسة دفتر أستاذ صريحة قبل نقل الحركات أو الأرصدة أو المكافآت أو الإحالات أو بطاقات العملاء. النموذج الحالي لا يحفظ بريد العميل، لذلك لا يمكنه اكتشاف تكرار البريد حتى يُعتمد حقل بريد اختياري وسياسة خصوصية منفصلة.
          </p>
        </section>

        {groups.length === 0 ? (
          <section className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">لا توجد مجموعات مشتبه بها</h2>
            <p className="mt-2 text-slate-500">
              ستظهر هنا فقط الأرقام التي تتطابق بعد توحيد التنسيق أو أي تعارض مستقبلي في كود العميل أو البريد المسجل.
            </p>
          </section>
        ) : (
          <div className="mt-6 space-y-6">
            {groups.map((group) => {
              const preview = getReadOnlyMergePreview(group);

              return (
                <section key={`${group.reason}:${group.key}`} className="rounded-3xl bg-white p-5 shadow-sm sm:p-7">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <h2 className="text-xl font-black text-slate-950">
                        {getDuplicateReasonLabel(group.reason)}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {group.customers.length} سجلات تحتاج مراجعة بشرية داخل نفس النشاط.
                      </p>
                    </div>
                    <span className="rounded-full bg-amber-100 px-3 py-2 text-sm font-bold text-amber-800">
                      معاينة غير قابلة للتنفيذ
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    {group.customers.map((customer) => {
                      const isSuggestedSurvivor = customer.id === preview.survivor.id;
                      return (
                        <article key={customer.id} className={`rounded-2xl border p-4 ${isSuggestedSurvivor ? "border-violet-300 bg-violet-50" : "border-slate-200 bg-slate-50"}`}>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <h3 className="font-black text-slate-950">
                                {customer.firstName} {customer.lastName ?? ""}
                              </h3>
                              <p className="mt-1 text-sm text-slate-600">{customer.phone} · {customer.customerCode}</p>
                            </div>
                            {isSuggestedSurvivor ? (
                              <span className="rounded-full bg-violet-600 px-3 py-1 text-xs font-bold text-white">سجل البقاء المقترح</span>
                            ) : null}
                          </div>

                          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="rounded-xl bg-white p-2"><strong className="block text-base text-slate-950">{customer.balance}</strong>{business.unitName}</div>
                            <div className="rounded-xl bg-white p-2"><strong className="block text-base text-slate-950">{customer._count.transactions}</strong>حركة</div>
                            <div className="rounded-xl bg-white p-2"><strong className="block text-base text-slate-950">{customer._count.redemptions}</strong>استبدال</div>
                          </div>

                          <dl className="mt-4 grid gap-2 text-sm text-slate-600">
                            <div><dt className="inline font-bold text-slate-800">إجمالي مكتسب:</dt> {customer.lifetimeEarned}</div>
                            <div><dt className="inline font-bold text-slate-800">إجمالي مستبدل:</dt> {customer.lifetimeRedeemed}</div>
                            <div><dt className="inline font-bold text-slate-800">الوسوم:</dt> {customer.tagAssignments.map((assignment) => assignment.tag.name).join("، ") || "—"}</div>
                            <div><dt className="inline font-bold text-slate-800">ملاحظات خاصة:</dt> {customer._count.notes}</div>
                            <div><dt className="inline font-bold text-slate-800">إحالات:</dt> {customer.referralsMade.length} صادرة، {customer.referralsReceived.length} واردة</div>
                            <div><dt className="inline font-bold text-slate-800">نشاط:</dt> {customer._count.activities}</div>
                          </dl>

                          <div className="mt-4 border-t border-slate-200 pt-3 text-xs text-slate-500">
                            <p>آخر الحركات: {customer.transactions.map((transaction) => `${transaction.type} ${transaction.amount}`).join(" · ") || "—"}</p>
                            <p className="mt-1">آخر الاستبدالات: {customer.redemptions.map((redemption) => redemption.rewardName).join(" · ") || "—"}</p>
                            <p className="mt-1">آخر الملاحظات الخاصة: {customer.notes.map((note) => note.content).join(" · ") || "—"}</p>
                            <p className="mt-1">آخر النشاط: {customer.activities.map((activity) => activity.description).join(" · ") || "—"}</p>
                          </div>

                          <Link href={`/businesses/${business.slug}/customers/${customer.id}`} className="mt-4 inline-flex rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700">
                            فتح ملف العميل
                          </Link>
                        </article>
                      );
                    })}
                  </div>

                  <div className="mt-5 rounded-2xl bg-slate-100 p-4 text-xs leading-6 text-slate-700">
                    <p className="font-black text-slate-900">متطلبات أي دمج مستقبلي</p>
                    <ul className="mt-1 list-disc space-y-1 pr-5">
                      {preview.preservationRequirements.map((requirement) => (
                        <li key={requirement}>{requirement}</li>
                      ))}
                    </ul>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
