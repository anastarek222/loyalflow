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
    <main className="min-h-screen px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href={`/businesses/${business.slug}/customers`}
          className="text-sm font-medium text-primary hover:text-primary"
        >
          → الرجوع إلى العملاء
        </Link>

        <header className="mt-6 rounded-[var(--lf-radius-card)] p-6 text-white shadow-xl sm:p-8">
          <p className="text-sm font-bold text-info">مراجعة فقط</p>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">مراجعة العملاء المتشابهين</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-foreground-subtle">
            نعرض إشارات متطابقة داخل {business.name} فقط. لا يتم دمج أو حذف أي عميل، ولا تتغير الأرصدة أو الحركات أو البطاقات العامة من هذه الصفحة.
          </p>
        </header>

        <section className="mt-6 rounded-[var(--lf-radius-card)] border border-warning/30 bg-warning-subtle p-6 text-sm leading-6 text-warning shadow-sm">
          <p className="font-black">الدمج غير مفعّل عمدًا</p>
          <p className="mt-1">
            يلزم قرار أعمال وسياسة دفتر أستاذ صريحة قبل نقل الحركات أو الأرصدة أو المكافآت أو الإحالات أو بطاقات العملاء. النموذج الحالي لا يحفظ بريد العميل، لذلك لا يمكنه اكتشاف تكرار البريد حتى يُعتمد حقل بريد اختياري وسياسة خصوصية منفصلة.
          </p>
        </section>

        {groups.length === 0 ? (
          <section className="mt-6 rounded-[var(--lf-radius-card)] border border-dashed border-border bg-white p-12 text-center shadow-sm">
            <h2 className="text-xl font-bold text-foreground">لا توجد مجموعات مشتبه بها</h2>
            <p className="mt-2 text-foreground-subtle">
              ستظهر هنا فقط الأرقام التي تتطابق بعد توحيد التنسيق أو أي تعارض مستقبلي في كود العميل أو البريد المسجل.
            </p>
          </section>
        ) : (
          <div className="mt-6 space-y-6">
            {groups.map((group) => {
              const preview = getReadOnlyMergePreview(group);

              return (
                <section key={`${group.reason}:${group.key}`} className="rounded-[var(--lf-radius-card)] bg-white p-6 shadow-sm sm:p-8">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                      <h2 className="text-xl font-black text-foreground">
                        {getDuplicateReasonLabel(group.reason)}
                      </h2>
                      <p className="mt-1 text-sm text-foreground-subtle">
                        {group.customers.length} سجلات تحتاج مراجعة بشرية داخل نفس النشاط.
                      </p>
                    </div>
                    <span className="rounded-full bg-warning-subtle px-4 py-2 text-sm font-bold text-warning">
                      معاينة غير قابلة للتنفيذ
                    </span>
                  </div>

                  <div className="mt-6 grid gap-4 lg:grid-cols-2">
                    {group.customers.map((customer) => {
                      const isSuggestedSurvivor = customer.id === preview.survivor.id;
                      return (
                        <article key={customer.id} className={`rounded-[var(--lf-radius-card)] border p-4 ${isSuggestedSurvivor ? "border-primary/30 bg-primary-subtle" : "border-border bg-surface-subtle"}`}>
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                              <h3 className="font-black text-foreground">
                                {customer.firstName} {customer.lastName ?? ""}
                              </h3>
                              <p className="mt-1 text-sm text-foreground-muted">{customer.phone} · {customer.customerCode}</p>
                            </div>
                            {isSuggestedSurvivor ? (
                              <span className="rounded-full bg-primary px-4 py-1 text-xs font-bold text-[var(--lf-primary-foreground)]">سجل البقاء المقترح</span>
                            ) : null}
                          </div>

                          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="rounded-[var(--lf-radius-input)] bg-white p-2"><strong className="block text-base text-foreground">{customer.balance}</strong>{business.unitName}</div>
                            <div className="rounded-[var(--lf-radius-input)] bg-white p-2"><strong className="block text-base text-foreground">{customer._count.transactions}</strong>حركة</div>
                            <div className="rounded-[var(--lf-radius-input)] bg-white p-2"><strong className="block text-base text-foreground">{customer._count.redemptions}</strong>استبدال</div>
                          </div>

                          <dl className="mt-4 grid gap-2 text-sm text-foreground-muted">
                            <div><dt className="inline font-bold text-foreground-muted">إجمالي مكتسب:</dt> {customer.lifetimeEarned}</div>
                            <div><dt className="inline font-bold text-foreground-muted">إجمالي مستبدل:</dt> {customer.lifetimeRedeemed}</div>
                            <div><dt className="inline font-bold text-foreground-muted">الوسوم:</dt> {customer.tagAssignments.map((assignment) => assignment.tag.name).join("، ") || "—"}</div>
                            <div><dt className="inline font-bold text-foreground-muted">ملاحظات خاصة:</dt> {customer._count.notes}</div>
                            <div><dt className="inline font-bold text-foreground-muted">إحالات:</dt> {customer.referralsMade.length} صادرة، {customer.referralsReceived.length} واردة</div>
                            <div><dt className="inline font-bold text-foreground-muted">نشاط:</dt> {customer._count.activities}</div>
                          </dl>

                          <div className="mt-4 border-t border-border pt-4 text-xs text-foreground-subtle">
                            <p>آخر الحركات: {customer.transactions.map((transaction) => `${transaction.type} ${transaction.amount}`).join(" · ") || "—"}</p>
                            <p className="mt-1">آخر الاستبدالات: {customer.redemptions.map((redemption) => redemption.rewardName).join(" · ") || "—"}</p>
                            <p className="mt-1">آخر الملاحظات الخاصة: {customer.notes.map((note) => note.content).join(" · ") || "—"}</p>
                            <p className="mt-1">آخر النشاط: {customer.activities.map((activity) => activity.description).join(" · ") || "—"}</p>
                          </div>

                          <Link href={`/businesses/${business.slug}/customers/${customer.id}`} className="mt-4 inline-flex rounded-[var(--lf-radius-input)] bg-foreground px-4 py-2 text-sm font-semibold text-white hover:bg-primary-subtle">
                            فتح ملف العميل
                          </Link>
                        </article>
                      );
                    })}
                  </div>

                  <div className="mt-6 rounded-[var(--lf-radius-card)] bg-surface-subtle p-4 text-xs leading-6 text-foreground-muted">
                    <p className="font-black text-foreground">متطلبات أي دمج مستقبلي</p>
                    <ul className="mt-1 list-disc space-y-1 pr-6">
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
