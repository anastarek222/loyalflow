import { auth } from "@/auth";
import {
  findDuplicateCustomerGroups,
  getDuplicateReasonLabel,
  getReadOnlyMergePreview,
} from "@/lib/customers/duplicates";
import { normalizeLanguage } from "@/lib/i18n";
import { canPerform } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type DuplicateReviewPageProps = {
  params: Promise<{ slug: string }>;
};

function transactionTypeLabel(type: string, language: "AR" | "EN") {
  if (type === "EARN") return language === "AR" ? "إضافة" : "Earn";
  if (type === "REDEEM") return language === "AR" ? "استبدال" : "Redeem";
  if (type === "ADJUST") return language === "AR" ? "تعديل" : "Adjust";
  return type;
}

export default async function DuplicateReviewPage({
  params,
}: DuplicateReviewPageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { slug } = await params;
  const [business, currentUser] = await Promise.all([
    prisma.business.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        unitName: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { language: true },
    }),
  ]);
  if (!business) notFound();

  if (!canPerform(session.user, business.id, "CUSTOMERS_EDIT")) {
    redirect(`/businesses/${slug}/customers`);
  }

  const language = normalizeLanguage(currentUser?.language);
  const copy =
    language === "AR"
      ? {
          back: "الرجوع إلى العملاء",
          reviewOnly: "مراجعة فقط",
          title: "مراجعة العملاء المتشابهين",
          description: `نعرض إشارات متطابقة داخل ${business.name} فقط. لا يتم دمج أو حذف أي عميل، ولا تتغير الأرصدة أو الحركات أو البطاقات العامة من هذه الصفحة.`,
          mergeDisabled: "الدمج غير مفعّل عمدًا",
          mergeDisabledDescription:
            "يلزم قرار أعمال وسياسة دفتر أستاذ صريحة قبل نقل الحركات أو الأرصدة أو المكافآت أو الإحالات أو بطاقات العملاء. النموذج الحالي لا يحفظ بريد العميل، لذلك لا يمكنه اكتشاف تكرار البريد حتى يُعتمد حقل بريد اختياري وسياسة خصوصية منفصلة.",
          noGroups: "لا توجد مجموعات مشتبه بها",
          noGroupsDescription:
            "ستظهر هنا فقط الأرقام التي تتطابق بعد توحيد التنسيق أو أي تعارض مستقبلي في كود العميل أو البريد المسجل.",
          recordsNeedReview: (count: number) =>
            `${count} سجلات تحتاج مراجعة بشرية داخل نفس النشاط.`,
          previewOnly: "معاينة غير قابلة للتنفيذ",
          suggestedSurvivor: "سجل البقاء المقترح",
          balance: "الرصيد",
          transactions: "حركة",
          redemptions: "استبدال",
          lifetimeEarned: "إجمالي مكتسب:",
          lifetimeRedeemed: "إجمالي مستبدل:",
          tags: "الوسوم:",
          privateNotes: "ملاحظات خاصة:",
          referrals: "إحالات:",
          outbound: "صادرة",
          inbound: "واردة",
          activity: "نشاط:",
          recentTransactions: "آخر الحركات:",
          recentRedemptions: "آخر الاستبدالات:",
          recentNotes: "آخر الملاحظات الخاصة:",
          recentActivity: "آخر النشاط:",
          openCustomer: "فتح ملف العميل",
          futureMergeRequirements: "متطلبات أي دمج مستقبلي",
        }
      : {
          back: "Back to customers",
          reviewOnly: "Review only",
          title: "Review similar customers",
          description: `Only potential matches inside ${business.name} are shown. No customer is merged or deleted, and balances, ledger activity, and public cards are unchanged from this page.`,
          mergeDisabled: "Merging is intentionally disabled",
          mergeDisabledDescription:
            "An explicit business decision and ledger policy are required before moving transactions, balances, rewards, referrals, or customer cards. The current customer model does not persist email, so email duplicates cannot be detected until an optional email field and separate privacy policy are approved.",
          noGroups: "No suspected duplicate groups",
          noGroupsDescription:
            "Only phone numbers that match after normalization, or a future customer-code or stored-email conflict, will appear here.",
          recordsNeedReview: (count: number) =>
            `${count} ${count === 1 ? "record needs" : "records need"} human review within this business.`,
          previewOnly: "Non-executable preview",
          suggestedSurvivor: "Suggested survivor",
          balance: "Balance",
          transactions: "Transactions",
          redemptions: "Redemptions",
          lifetimeEarned: "Lifetime earned:",
          lifetimeRedeemed: "Lifetime redeemed:",
          tags: "Tags:",
          privateNotes: "Private notes:",
          referrals: "Referrals:",
          outbound: "outbound",
          inbound: "inbound",
          activity: "Activity:",
          recentTransactions: "Recent transactions:",
          recentRedemptions: "Recent redemptions:",
          recentNotes: "Recent private notes:",
          recentActivity: "Recent activity:",
          openCustomer: "Open customer profile",
          futureMergeRequirements: "Requirements for any future merge",
        };

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
        select: {
          id: true,
          type: true,
          amount: true,
          balanceAfter: true,
          createdAt: true,
        },
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
    <main
      className="min-h-screen px-4 py-6 sm:px-8 sm:py-8"
      dir={language === "AR" ? "rtl" : "ltr"}
      data-duplicate-review-language={language}
    >
      <div className="mx-auto max-w-6xl">
        <Link
          href={`/businesses/${business.slug}/customers`}
          className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:text-primary-hover"
        >
          {language === "AR" ? "→" : "←"} {copy.back}
        </Link>

        <header className="mt-6 rounded-[var(--lf-radius-lg)] border border-border bg-surface-raised p-6 shadow-[var(--lf-shadow-raised)] sm:p-8">
          <p className="text-sm font-bold text-info">{copy.reviewOnly}</p>
          <h1 className="mt-2 lf-type-display text-foreground">{copy.title}</h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-foreground-muted">
            {copy.description}
          </p>
        </header>

        <section className="mt-6 rounded-[var(--lf-radius-lg)] border border-warning/30 bg-warning-subtle p-6 text-sm leading-6 text-warning shadow-[var(--lf-shadow-raised)]">
          <p className="font-black">{copy.mergeDisabled}</p>
          <p className="mt-1">{copy.mergeDisabledDescription}</p>
        </section>

        {groups.length === 0 ? (
          <section className="mt-6 rounded-[var(--lf-radius-lg)] border border-dashed border-border bg-surface p-12 text-center shadow-[var(--lf-shadow-raised)]">
            <h2 className="text-xl font-bold text-foreground">{copy.noGroups}</h2>
            <p className="mt-2 text-foreground-subtle">
              {copy.noGroupsDescription}
            </p>
          </section>
        ) : (
          <div className="mt-6 space-y-6">
            {groups.map((group) => {
              const preview = getReadOnlyMergePreview(group, language);

              return (
                <section
                  key={`${group.reason}:${group.key}`}
                  className="rounded-[var(--lf-radius-lg)] border border-border bg-surface p-6 shadow-[var(--lf-shadow-raised)] sm:p-8"
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                      <h2 className="text-xl font-black text-foreground">
                        {getDuplicateReasonLabel(group.reason, language)}
                      </h2>
                      <p className="mt-1 text-sm text-foreground-subtle">
                        {copy.recordsNeedReview(group.customers.length)}
                      </p>
                    </div>
                    <span className="rounded-full bg-warning-subtle px-4 py-2 text-sm font-bold text-warning">
                      {copy.previewOnly}
                    </span>
                  </div>

                  <div className="mt-6 grid gap-4 lg:grid-cols-2">
                    {group.customers.map((customer) => {
                      const isSuggestedSurvivor =
                        customer.id === preview.survivor.id;
                      return (
                        <article
                          key={customer.id}
                          className={`rounded-[var(--lf-radius-lg)] border p-4 ${
                            isSuggestedSurvivor
                              ? "border-primary/30 bg-[var(--lf-primary-soft)]"
                              : "border-border bg-surface-subtle"
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="min-w-0">
                              <h3 dir="auto" className="font-black text-foreground">
                                {customer.firstName} {customer.lastName ?? ""}
                              </h3>
                              <p
                                dir="ltr"
                                className="mt-1 text-sm text-foreground-muted"
                              >
                                {customer.phone} · {customer.customerCode}
                              </p>
                            </div>
                            {isSuggestedSurvivor ? (
                              <span className="rounded-full bg-primary px-4 py-1 text-xs font-bold text-primary-foreground">
                                {copy.suggestedSurvivor}
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="rounded-[var(--lf-radius-md)] border border-border bg-surface p-2">
                              <strong className="block text-base text-foreground">
                                {customer.balance}
                              </strong>
                              {copy.balance} · {business.unitName}
                            </div>
                            <div className="rounded-[var(--lf-radius-md)] border border-border bg-surface p-2">
                              <strong className="block text-base text-foreground">
                                {customer._count.transactions}
                              </strong>
                              {copy.transactions}
                            </div>
                            <div className="rounded-[var(--lf-radius-md)] border border-border bg-surface p-2">
                              <strong className="block text-base text-foreground">
                                {customer._count.redemptions}
                              </strong>
                              {copy.redemptions}
                            </div>
                          </div>

                          <dl className="mt-4 grid gap-2 text-sm text-foreground-muted">
                            <div>
                              <dt className="inline font-bold text-foreground-muted">
                                {copy.lifetimeEarned}
                              </dt>{" "}
                              {customer.lifetimeEarned}
                            </div>
                            <div>
                              <dt className="inline font-bold text-foreground-muted">
                                {copy.lifetimeRedeemed}
                              </dt>{" "}
                              {customer.lifetimeRedeemed}
                            </div>
                            <div>
                              <dt className="inline font-bold text-foreground-muted">
                                {copy.tags}
                              </dt>{" "}
                              {customer.tagAssignments
                                .map((assignment) => assignment.tag.name)
                                .join(language === "AR" ? "، " : ", ") || "—"}
                            </div>
                            <div>
                              <dt className="inline font-bold text-foreground-muted">
                                {copy.privateNotes}
                              </dt>{" "}
                              {customer._count.notes}
                            </div>
                            <div>
                              <dt className="inline font-bold text-foreground-muted">
                                {copy.referrals}
                              </dt>{" "}
                              {customer.referralsMade.length} {copy.outbound},{" "}
                              {customer.referralsReceived.length} {copy.inbound}
                            </div>
                            <div>
                              <dt className="inline font-bold text-foreground-muted">
                                {copy.activity}
                              </dt>{" "}
                              {customer._count.activities}
                            </div>
                          </dl>

                          <div className="mt-4 border-t border-border pt-4 text-xs text-foreground-subtle">
                            <p>
                              {copy.recentTransactions}{" "}
                              {customer.transactions
                                .map(
                                  (transaction) =>
                                    `${transactionTypeLabel(transaction.type, language)} ${transaction.amount}`,
                                )
                                .join(" · ") || "—"}
                            </p>
                            <p className="mt-1">
                              {copy.recentRedemptions}{" "}
                              {customer.redemptions
                                .map((redemption) => redemption.rewardName)
                                .join(" · ") || "—"}
                            </p>
                            <p className="mt-1">
                              {copy.recentNotes}{" "}
                              {customer.notes
                                .map((note) => note.content)
                                .join(" · ") || "—"}
                            </p>
                            <p className="mt-1">
                              {copy.recentActivity}{" "}
                              {customer.activities
                                .map((activity) => activity.description)
                                .join(" · ") || "—"}
                            </p>
                          </div>

                          <Link
                            href={`/businesses/${business.slug}/customers/${customer.id}`}
                            className="mt-4 inline-flex min-h-11 items-center rounded-[var(--lf-radius-md)] bg-foreground px-4 py-2 text-sm font-semibold text-[var(--lf-inverse)] transition-colors hover:bg-primary"
                          >
                            {copy.openCustomer}
                          </Link>
                        </article>
                      );
                    })}
                  </div>

                  <div className="mt-6 rounded-[var(--lf-radius-lg)] bg-surface-subtle p-4 text-xs leading-6 text-foreground-muted">
                    <p className="font-black text-foreground">
                      {copy.futureMergeRequirements}
                    </p>
                    <ul
                      className={`mt-1 list-disc space-y-1 ${
                        language === "AR" ? "pr-6" : "pl-6"
                      }`}
                    >
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
