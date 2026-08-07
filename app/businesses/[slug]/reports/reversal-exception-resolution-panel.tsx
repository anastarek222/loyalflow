"use client";

import { useFormStatus } from "react-dom";

import { resolveReversalExceptionAction } from "./reversal-exception-actions";

type ReversalExceptionItem = {
  id: string;
  reversalKind: "EARN_REFUND" | "EARN_VOID" | "REDEMPTION_REVERSAL";
  attemptedAmount: number;
  attemptedSaleAmount: number | null;
  availableBalance: number;
  reason: string;
  createdAtLabel: string;
  customerName: string;
  customerCode: string;
  originalAmount: number;
  originalSaleAmount: number | null;
};

function ResolveButton({ language }: { language: "AR" | "EN" }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-11 items-center justify-center rounded-[var(--lf-radius-input)] bg-primary px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending
        ? language === "AR"
          ? "جارٍ الإغلاق..."
          : "Resolving..."
        : language === "AR"
          ? "إغلاق الحالة"
          : "Resolve exception"}
    </button>
  );
}

function kindLabel(
  kind: ReversalExceptionItem["reversalKind"],
  language: "AR" | "EN",
) {
  if (language === "AR") {
    if (kind === "EARN_VOID") return "إلغاء كامل لعملية كسب";
    if (kind === "EARN_REFUND") return "استرداد من عملية كسب";
    return "عكس استبدال مكافأة";
  }

  if (kind === "EARN_VOID") return "Full earn void";
  if (kind === "EARN_REFUND") return "Earn refund";
  return "Redemption reversal";
}

export function ReversalExceptionResolutionPanel({
  slug,
  language,
  items,
}: {
  slug: string;
  language: "AR" | "EN";
  items: ReversalExceptionItem[];
}) {
  const action = resolveReversalExceptionAction.bind(null, slug);
  const numberFormatter = new Intl.NumberFormat(language === "AR" ? "ar-EG" : "en-US");

  if (items.length === 0) {
    return (
      <section className="rounded-[var(--lf-radius-card)] border border-border bg-surface p-6">
        <h2 className="text-lg font-bold text-foreground">
          {language === "AR" ? "لا توجد حالات مفتوحة" : "No open exceptions"}
        </h2>
        <p className="mt-2 text-sm text-foreground-muted">
          {language === "AR"
            ? "لا توجد عمليات عكس متوقفة بسبب عدم كفاية الرصيد وتحتاج متابعة الآن."
            : "There are no blocked reversal operations that currently require follow-up."}
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4" aria-label={language === "AR" ? "حالات العكس المفتوحة" : "Open reversal exceptions"}>
      {items.map((item) => (
        <article
          key={item.id}
          className="rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 sm:p-6"
        >
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-amber-700">
                {kindLabel(item.reversalKind, language)}
              </p>
              <h2 dir="auto" className="mt-1 text-lg font-bold text-foreground">
                {item.customerName}
              </h2>
              <p dir="ltr" className="mt-1 text-xs text-foreground-subtle">
                {item.customerCode}
              </p>
            </div>
            <span className="w-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
              {language === "AR" ? "تحتاج متابعة" : "Needs follow-up"}
            </span>
          </div>

          <dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[var(--lf-radius-input)] bg-surface-subtle p-3">
              <dt className="text-xs text-foreground-subtle">
                {language === "AR" ? "المبلغ المطلوب عكسه" : "Attempted reversal"}
              </dt>
              <dd className="mt-1 font-semibold text-foreground">
                {numberFormatter.format(item.attemptedAmount)}
              </dd>
            </div>
            <div className="rounded-[var(--lf-radius-input)] bg-surface-subtle p-3">
              <dt className="text-xs text-foreground-subtle">
                {language === "AR" ? "الرصيد وقت التعذر" : "Balance when blocked"}
              </dt>
              <dd className="mt-1 font-semibold text-foreground">
                {numberFormatter.format(item.availableBalance)}
              </dd>
            </div>
            <div className="rounded-[var(--lf-radius-input)] bg-surface-subtle p-3">
              <dt className="text-xs text-foreground-subtle">
                {language === "AR" ? "العملية الأصلية" : "Original earn"}
              </dt>
              <dd className="mt-1 font-semibold text-foreground">
                {numberFormatter.format(item.originalAmount)}
              </dd>
            </div>
            <div className="rounded-[var(--lf-radius-input)] bg-surface-subtle p-3">
              <dt className="text-xs text-foreground-subtle">
                {language === "AR" ? "وقت تسجيل الحالة" : "Exception recorded"}
              </dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">
                {item.createdAtLabel}
              </dd>
            </div>
          </dl>

          {(item.attemptedSaleAmount !== null || item.originalSaleAmount !== null) && (
            <p className="mt-3 text-sm text-foreground-muted">
              {language === "AR" ? "قيمة البيع: " : "Sale value: "}
              <span className="font-semibold text-foreground">
                {item.attemptedSaleAmount === null
                  ? "—"
                  : numberFormatter.format(item.attemptedSaleAmount)}
              </span>
              {" / "}
              <span className="text-foreground-subtle">
                {item.originalSaleAmount === null
                  ? "—"
                  : numberFormatter.format(item.originalSaleAmount)}
              </span>
            </p>
          )}

          <p dir="auto" className="mt-4 rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle p-3 text-sm text-foreground-muted">
            <span className="font-semibold text-foreground">
              {language === "AR" ? "سبب محاولة العكس: " : "Original operator reason: "}
            </span>
            {item.reason}
          </p>

          <form action={action} className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <input type="hidden" name="exceptionId" value={item.id} />
            <div>
              <label htmlFor={`resolutionNote-${item.id}`} className="mb-2 block text-sm font-semibold text-foreground">
                {language === "AR" ? "ملاحظة الإغلاق" : "Resolution note"}
              </label>
              <textarea
                id={`resolutionNote-${item.id}`}
                name="resolutionNote"
                required
                minLength={1}
                maxLength={500}
                rows={3}
                placeholder={
                  language === "AR"
                    ? "اكتب كيف تمت متابعة الحالة ولماذا يمكن إغلاقها..."
                    : "Explain how the exception was followed up and why it can be closed..."
                }
                className="w-full rounded-[var(--lf-radius-input)] border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
            <ResolveButton language={language} />
          </form>

          <p className="mt-3 text-xs text-foreground-subtle">
            {language === "AR"
              ? "إغلاق الحالة تشغيلي فقط؛ لا يغيّر رصيد العميل ولا سجل الـLedger."
              : "Resolving this exception is operational only; it does not change customer balance or the ledger."}
          </p>
        </article>
      ))}
    </section>
  );
}
