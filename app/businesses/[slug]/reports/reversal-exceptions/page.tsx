import { auth } from "@/auth";
import { normalizeLanguage } from "@/lib/i18n";
import prisma from "@/lib/prisma";
import { getBusinessTheme } from "@/lib/theme";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ReversalExceptionResolutionPanel } from "../reversal-exception-resolution-panel";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string; success?: string; after?: string }>;
};

function feedbackCopy(
  language: "AR" | "EN",
  query: { error?: string; success?: string },
) {
  if (query.success === "reversal-exception-resolved") {
    return {
      tone: "success" as const,
      text:
        language === "AR"
          ? "تم إغلاق حالة العكس وحفظ ملاحظة المتابعة."
          : "The reversal exception was resolved and the follow-up note was saved.",
    };
  }

  if (query.success === "reversal-exception-resolution-replayed") {
    return {
      tone: "success" as const,
      text:
        language === "AR"
          ? "كانت هذه الحالة مغلقة بالفعل بنفس ملاحظة المتابعة."
          : "This exception had already been resolved with the same note.",
    };
  }

  if (!query.error) return null;

  const ar: Record<string, string> = {
    "reversal-exception-invalid": "بيانات الإغلاق غير صالحة. راجع الملاحظة وحاول مرة أخرى.",
    "reversal-exception-permission": "ليس لديك صلاحية إغلاق حالات العكس.",
    "reversal-exception-context": "تعذر التحقق من صلاحية العملية في هذا النشاط.",
    "reversal-exception-aborted": "تغيرت الحالة أثناء التنفيذ. أعد تحميل الصفحة وحاول مرة أخرى.",
    "reversal-exception-missing": "حالة العكس لم تعد موجودة أو لا تخص هذا النشاط.",
    "reversal-exception-already-resolved": "تم إغلاق الحالة سابقًا بملاحظة مختلفة ولا يمكن إعادة كتابة تاريخ الإغلاق.",
  };
  const en: Record<string, string> = {
    "reversal-exception-invalid": "The resolution input is invalid. Review the note and try again.",
    "reversal-exception-permission": "You do not have permission to resolve reversal exceptions.",
    "reversal-exception-context": "The operation could not be authorized for this business.",
    "reversal-exception-aborted": "The exception changed during the operation. Refresh and try again.",
    "reversal-exception-missing": "The reversal exception no longer exists or does not belong to this business.",
    "reversal-exception-already-resolved": "The exception was already resolved with a different note and its resolution history cannot be rewritten.",
  };

  return {
    tone: "error" as const,
    text:
      (language === "AR" ? ar[query.error] : en[query.error]) ??
      (language === "AR" ? "تعذر إغلاق الحالة." : "The exception could not be resolved."),
  };
}

export default async function ReversalExceptionsPage({
  params,
  searchParams,
}: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { slug } = await params;
  const query = await searchParams;

  const business = await prisma.business.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      primaryColor: true,
      secondaryColor: true,
      themePreset: true,
      cardStyle: true,
      fontFamily: true,
    },
  });

  if (!business) notFound();

  const actorAllowed =
    session.user.role === "SUPER_ADMIN" ||
    (session.user.role === "OWNER" && session.user.businessId === business.id);

  if (!actorAllowed) {
    redirect(`/businesses/${business.slug}/reports?error=reversal-exception-permission`);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { language: true },
  });
  const language = normalizeLanguage(user?.language);
  const theme = getBusinessTheme(business);
  const dateFormatter = new Intl.DateTimeFormat(
    language === "AR" ? "ar-EG" : "en-US",
    { dateStyle: "medium", timeStyle: "short" },
  );

  const pageSize = 50;
  const exceptions = await prisma.reversalException.findMany({
    where: {
      businessId: business.id,
      status: "OPEN",
      blockReason: "INSUFFICIENT_BALANCE",
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    ...(query.after ? { cursor: { id: query.after }, skip: 1 } : {}),
    take: pageSize + 1,
    select: {
      id: true,
      reversalKind: true,
      attemptedAmount: true,
      attemptedSaleAmount: true,
      availableBalance: true,
      reason: true,
      createdAt: true,
      customer: {
        select: {
          firstName: true,
          lastName: true,
          customerCode: true,
        },
      },
      originalTransaction: {
        select: {
          amount: true,
          saleAmount: true,
        },
      },
    },
  });

  const hasMore = exceptions.length > pageSize;
  const visibleExceptions = exceptions.slice(0, pageSize);
  const nextCursor = hasMore ? visibleExceptions.at(-1)?.id : null;
  const feedback = feedbackCopy(language, query);
  const items = visibleExceptions.map((exception) => ({
    id: exception.id,
    reversalKind: exception.reversalKind,
    attemptedAmount: exception.attemptedAmount,
    attemptedSaleAmount: exception.attemptedSaleAmount,
    availableBalance: exception.availableBalance,
    reason: exception.reason,
    createdAtLabel: dateFormatter.format(exception.createdAt),
    customerName:
      [exception.customer.firstName, exception.customer.lastName]
        .filter(Boolean)
        .join(" ") ||
      (language === "AR" ? "عميل بدون اسم" : "Unnamed customer"),
    customerCode: exception.customer.customerCode,
    originalAmount: exception.originalTransaction.amount,
    originalSaleAmount: exception.originalTransaction.saleAmount,
  }));

  return (
    <main
      className="min-h-screen px-4 py-5 sm:px-8 sm:py-8"
      style={{
        backgroundColor: theme.backgroundColor,
        fontFamily: theme.fontFamily,
      }}
    >
      <div className="mx-auto max-w-6xl">
        <Link
          href={`/businesses/${business.slug}/reports`}
          className="text-sm font-semibold text-primary hover:underline"
        >
          {language === "AR" ? "← العودة إلى التقارير" : "← Back to reports"}
        </Link>

        <header className="mt-5 rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-foreground-subtle">
            {language === "AR" ? "متابعة تشغيلية" : "Operational follow-up"}
          </p>
          <div className="mt-1 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-2xl font-black text-foreground sm:text-3xl">
                {language === "AR" ? "حالات العكس المفتوحة" : "Open reversal exceptions"}
              </h1>
              <p dir="auto" className="mt-2 text-sm text-foreground-muted">
                {language === "AR"
                  ? "راجع العمليات التي تعذر عكسها بسبب عدم كفاية رصيد العميل، ثم أغلق الحالة بعد المتابعة الفعلية."
                  : "Review reversals blocked by insufficient customer balance, then resolve each exception after real follow-up."}
              </p>
            </div>
            <span className="w-fit rounded-full bg-amber-50 px-3 py-1 text-sm font-bold text-amber-800">
              {items.length} {language === "AR" ? "معروضة" : "shown"}
            </span>
          </div>
        </header>

        {feedback && (
          <div
            role="status"
            className={`mt-4 rounded-[var(--lf-radius-input)] border p-3 text-sm font-semibold ${
              feedback.tone === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            {feedback.text}
          </div>
        )}

        <div className="mt-5">
          <ReversalExceptionResolutionPanel
            slug={business.slug}
            language={language}
            items={items}
          />
        </div>

        {hasMore && nextCursor ? (
          <div className="mt-5 flex justify-end">
            <Link
              href={`/businesses/${business.slug}/reports/reversal-exceptions?after=${encodeURIComponent(nextCursor)}`}
              className="rounded-[var(--lf-radius-input)] border border-border bg-surface px-4 py-2 text-sm font-bold text-foreground hover:bg-surface-subtle"
            >
              {language === "AR" ? "عرض الحالات الأحدث التالية" : "Show next newer exceptions"}
            </Link>
          </div>
        ) : null}
      </div>
    </main>
  );
}
