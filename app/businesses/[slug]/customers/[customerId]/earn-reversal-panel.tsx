import { randomUUID } from "node:crypto";

import { formatLoyaltyAmount } from "@/lib/loyalty/presentation";

import { reverseEarnAction } from "./reversal-actions";

type Language = "AR" | "EN";

type ReversalEntry = {
  amount: number;
  saleAmount: number | null;
  reversalKind: "EARN_REFUND" | "EARN_VOID" | "REDEMPTION_REVERSAL" | null;
};

type ReversibleEarn = {
  id: string;
  amount: number;
  saleAmount: number | null;
  sourceLoyaltyMode: "VISITS" | "POINTS" | "SALES_AMOUNT" | null;
  createdAt: Date;
  reversals: ReversalEntry[];
};

type EarnReversalPanelProps = {
  businessSlug: string;
  customerId: string;
  language: Language;
  unitName: string;
  currency: string | null;
  transactions: ReversibleEarn[];
  success?: string;
  error?: string;
};

function getFeedback(language: Language, success?: string, error?: string) {
  if (success === "earn-refunded") {
    return {
      tone: "success" as const,
      text: language === "AR" ? "تم تسجيل الاسترداد بنجاح." : "Refund recorded successfully.",
    };
  }

  if (success === "earn-voided") {
    return {
      tone: "success" as const,
      text: language === "AR" ? "تم إلغاء العملية الأصلية بنجاح." : "Original earn voided successfully.",
    };
  }

  if (!error?.startsWith("reversal-")) return null;

  const messages: Record<string, { AR: string; EN: string }> = {
    "reversal-invalid": {
      AR: "بيانات الاسترداد غير صالحة. راجع المبلغ والسبب ثم حاول مرة أخرى.",
      EN: "The reversal input is invalid. Review the amount and reason, then try again.",
    },
    "reversal-permission": {
      AR: "هذه العملية متاحة لمالك النشاط أو مدير المنصة فقط.",
      EN: "Only the business owner or platform administrator can perform this action.",
    },
    "reversal-original-missing": {
      AR: "تعذر العثور على العملية الأصلية داخل هذا النشاط والعميل.",
      EN: "The original earn could not be found for this business and customer.",
    },
    "reversal-complete": {
      AR: "تم عكس كامل قيمة هذه العملية بالفعل.",
      EN: "This earn has already been fully reversed.",
    },
    "reversal-exceeds-original": {
      AR: "قيمة الاسترداد تتجاوز الرصيد المتبقي من العملية الأصلية.",
      EN: "The refund exceeds the remaining reversible amount.",
    },
    "reversal-sale-invalid": {
      AR: "قيمة المبيعات المستردة غير متوافقة مع العملية الأصلية.",
      EN: "The refunded sale amount does not match the original sale constraints.",
    },
    "reversal-void-invalid": {
      AR: "الإلغاء الكامل متاح فقط عندما لم يتم استرداد جزء من العملية من قبل.",
      EN: "A full void is available only when no part of the earn has already been refunded.",
    },
    "reversal-insufficient-balance": {
      AR: "رصيد العميل الحالي لا يكفي لعكس هذه القيمة بدون إنشاء رصيد سالب.",
      EN: "The current customer balance is too low to reverse this amount without going negative.",
    },
    "reversal-conflict": {
      AR: "تم اكتشاف تعارض في معرّف العملية. أعد المحاولة من الصفحة الحالية.",
      EN: "An operation ID conflict was detected. Retry from the current page.",
    },
    "reversal-context": {
      AR: "سياق العملية غير صالح لهذا النشاط.",
      EN: "The operation context is not valid for this business.",
    },
    "reversal-aborted": {
      AR: "تم إيقاف العملية بأمان قبل تسجيل أي تغيير مالي.",
      EN: "The operation was safely aborted before recording a financial change.",
    },
  };

  const message = messages[error];
  return message
    ? { tone: "danger" as const, text: message[language] }
    : null;
}

export default function EarnReversalPanel({
  businessSlug,
  customerId,
  language,
  unitName,
  currency,
  transactions,
  success,
  error,
}: EarnReversalPanelProps) {
  const feedback = getFeedback(language, success, error);

  const reversible = transactions
    .map((transaction) => {
      const earnReversals = transaction.reversals.filter(
        (reversal) =>
          reversal.reversalKind === "EARN_REFUND" ||
          reversal.reversalKind === "EARN_VOID",
      );
      const reversedAmount = Math.abs(
        earnReversals.reduce((total, reversal) => total + reversal.amount, 0),
      );
      const reversedSaleAmount = earnReversals.reduce(
        (total, reversal) => total + (reversal.saleAmount ?? 0),
        0,
      );

      return {
        ...transaction,
        reversedAmount,
        reversedSaleAmount,
        remainingAmount: Math.max(0, transaction.amount - reversedAmount),
        remainingSaleAmount:
          transaction.saleAmount === null
            ? null
            : Math.max(0, transaction.saleAmount - reversedSaleAmount),
      };
    })
    .filter((transaction) => transaction.remainingAmount > 0)
    .slice(0, 5);

  const formatAmount = (transaction: ReversibleEarn, amount: number) =>
    formatLoyaltyAmount({
      loyaltyMode: transaction.sourceLoyaltyMode ?? "VISITS",
      language,
      unitName,
      currency,
      amount,
    });

  return (
    <section className="order-2 mt-6 rounded-[var(--lf-radius-card)] border border-warning/20 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.12em] text-warning">
          {language === "AR" ? "إجراء مالي محمي" : "Protected financial action"}
        </p>
        <h2 className="text-xl font-bold text-foreground">
          {language === "AR" ? "استرداد أو إلغاء رصيد مكتسب" : "Refund or void an earned credit"}
        </h2>
        <p className="text-sm leading-6 text-foreground-subtle">
          {language === "AR"
            ? "اختر عملية إضافة سابقة فقط. لن يتم حذف التاريخ؛ سيتم إنشاء عملية عكس مرتبطة بالعملية الأصلية."
            : "Choose a prior earn only. History is never deleted; a linked reversal entry is created instead."}
        </p>
      </div>

      {feedback ? (
        <div
          role="status"
          className={`mt-5 rounded-[var(--lf-radius-input)] border px-4 py-3 text-sm font-semibold ${
            feedback.tone === "success"
              ? "border-success/30 bg-success-subtle text-success"
              : "border-danger/30 bg-danger-subtle text-danger"
          }`}
        >
          {feedback.text}
        </div>
      ) : null}

      {reversible.length === 0 ? (
        <p className="mt-6 rounded-[var(--lf-radius-input)] bg-surface-subtle px-4 py-4 text-sm text-foreground-muted">
          {language === "AR"
            ? "لا توجد عملية إضافة حديثة قابلة للاسترداد ضمن السجل المعروض."
            : "There is no recent earn with a remaining reversible amount in the displayed history."}
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {reversible.map((transaction) => {
            const action = reverseEarnAction.bind(
              null,
              businessSlug,
              customerId,
            );
            const canVoid =
              transaction.reversedAmount === 0 &&
              transaction.remainingAmount === transaction.amount &&
              (transaction.saleAmount === null || transaction.reversedSaleAmount === 0);

            return (
              <article
                key={transaction.id}
                className="rounded-[var(--lf-radius-card)] border border-border bg-surface-subtle p-4"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <p className="font-bold text-foreground">
                      {language === "AR" ? "عملية إضافة" : "Earn"} · {formatAmount(transaction, transaction.amount)}
                    </p>
                    <p className="mt-1 text-xs text-foreground-subtle">
                      {transaction.createdAt.toLocaleString(language === "AR" ? "ar-EG" : "en-US")}
                    </p>
                    <p className="mt-2 text-sm text-foreground-muted">
                      {language === "AR" ? "المتاح للعكس:" : "Remaining reversible:"}{" "}
                      <strong>{formatAmount(transaction, transaction.remainingAmount)}</strong>
                    </p>
                    {transaction.saleAmount !== null ? (
                      <p dir="ltr" className="mt-1 text-xs text-foreground-subtle">
                        {language === "AR" ? "قيمة البيع الأصلية" : "Original sale"}: {transaction.saleAmount} · {language === "AR" ? "المتبقي" : "remaining"}: {transaction.remainingSaleAmount ?? 0}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <details className="rounded-[var(--lf-radius-input)] border border-border bg-white">
                    <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-foreground">
                      {language === "AR" ? "استرداد جزئي" : "Partial refund"}
                    </summary>
                    <form action={action} className="space-y-3 border-t border-border p-4">
                      <input type="hidden" name="kind" value="EARN_REFUND" />
                      <input type="hidden" name="originalTransactionId" value={transaction.id} />
                      <input type="hidden" name="operationId" value={randomUUID()} />

                      <label className="block text-sm font-medium text-foreground-muted">
                        {language === "AR" ? "قيمة الرصيد المسترد" : "Loyalty amount to refund"}
                        <input
                          name="amount"
                          type="number"
                          min="1"
                          max={transaction.remainingAmount}
                          required
                          className="mt-2 w-full rounded-[var(--lf-radius-input)] border border-border px-3 py-3 outline-none focus:border-primary/30"
                        />
                      </label>

                      {transaction.saleAmount !== null ? (
                        <label className="block text-sm font-medium text-foreground-muted">
                          {language === "AR" ? "قيمة البيع المستردة" : "Refunded sale amount"}
                          <input
                            name="saleAmount"
                            type="number"
                            min="1"
                            max={transaction.remainingSaleAmount ?? transaction.saleAmount}
                            required
                            className="mt-2 w-full rounded-[var(--lf-radius-input)] border border-border px-3 py-3 outline-none focus:border-primary/30"
                          />
                        </label>
                      ) : null}

                      <label className="block text-sm font-medium text-foreground-muted">
                        {language === "AR" ? "السبب" : "Reason"}
                        <textarea
                          name="reason"
                          required
                          minLength={1}
                          maxLength={500}
                          rows={2}
                          className="mt-2 w-full resize-y rounded-[var(--lf-radius-input)] border border-border px-3 py-3 outline-none focus:border-primary/30"
                        />
                      </label>

                      <button
                        type="submit"
                        className="w-full rounded-[var(--lf-radius-input)] border border-warning/30 bg-warning-subtle px-4 py-3 text-sm font-bold text-foreground"
                      >
                        {language === "AR" ? "تسجيل الاسترداد" : "Record refund"}
                      </button>
                    </form>
                  </details>

                  <details className="rounded-[var(--lf-radius-input)] border border-danger/20 bg-white">
                    <summary className={`px-4 py-3 text-sm font-bold ${canVoid ? "cursor-pointer text-danger" : "cursor-not-allowed text-foreground-subtle"}`}>
                      {language === "AR" ? "إلغاء كامل للعملية" : "Void full earn"}
                    </summary>
                    {canVoid ? (
                      <form action={action} className="space-y-3 border-t border-border p-4">
                        <input type="hidden" name="kind" value="EARN_VOID" />
                        <input type="hidden" name="originalTransactionId" value={transaction.id} />
                        <input type="hidden" name="operationId" value={randomUUID()} />
                        <input type="hidden" name="amount" value={transaction.amount} />
                        {transaction.saleAmount !== null ? (
                          <input type="hidden" name="saleAmount" value={transaction.saleAmount} />
                        ) : null}

                        <p className="text-sm leading-6 text-foreground-muted">
                          {language === "AR"
                            ? "سيتم عكس كامل قيمة هذه العملية مع الاحتفاظ بالسجل الأصلي وسجل الإلغاء."
                            : "The full earn will be reversed while preserving both the original and reversal records."}
                        </p>
                        <label className="block text-sm font-medium text-foreground-muted">
                          {language === "AR" ? "سبب الإلغاء" : "Void reason"}
                          <textarea
                            name="reason"
                            required
                            minLength={1}
                            maxLength={500}
                            rows={2}
                            className="mt-2 w-full resize-y rounded-[var(--lf-radius-input)] border border-border px-3 py-3 outline-none focus:border-danger/30"
                          />
                        </label>
                        <button
                          type="submit"
                          className="w-full rounded-[var(--lf-radius-input)] bg-danger px-4 py-3 text-sm font-bold text-white"
                        >
                          {language === "AR" ? "تأكيد الإلغاء الكامل" : "Confirm full void"}
                        </button>
                      </form>
                    ) : (
                      <p className="border-t border-border px-4 py-3 text-xs text-foreground-subtle">
                        {language === "AR"
                          ? "غير متاح بعد وجود استرداد جزئي على العملية."
                          : "Unavailable after a partial refund has already been recorded."}
                      </p>
                    )}
                  </details>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
