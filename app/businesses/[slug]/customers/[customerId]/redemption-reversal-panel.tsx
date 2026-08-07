import { randomUUID } from "node:crypto";

import { formatLoyaltyAmount } from "@/lib/loyalty/presentation";

import { reverseRedemptionAction } from "./redemption-reversal-actions";

type Language = "AR" | "EN";

type RedemptionRow = {
  id: string;
  rewardName: string;
  cost: number;
  createdAt: Date;
  transactionId: string | null;
  transaction: {
    id: string;
    type: "EARN" | "REDEEM" | "ADJUSTMENT" | "REVERSAL";
    sourceLoyaltyMode: "VISITS" | "POINTS" | "SALES_AMOUNT" | null;
    reversals: Array<{ id: string }>;
  } | null;
};

type Props = {
  businessSlug: string;
  customerId: string;
  language: Language;
  unitName: string;
  currency: string | null;
  redemptions: RedemptionRow[];
};

export default function RedemptionReversalPanel({
  businessSlug,
  customerId,
  language,
  unitName,
  currency,
  redemptions,
}: Props) {
  const reversible = redemptions
    .filter(
      (redemption) =>
        redemption.transactionId &&
        redemption.transaction?.type === "REDEEM" &&
        redemption.transaction.reversals.length === 0,
    )
    .slice(0, 5);

  return (
    <section className="mt-6 rounded-[var(--lf-radius-card)] border border-danger/20 bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-danger">
        {language === "AR" ? "إجراء مالي محمي" : "Protected financial action"}
      </p>
      <h2 className="mt-2 text-xl font-bold text-foreground">
        {language === "AR" ? "إلغاء استبدال سابق" : "Reverse a prior redemption"}
      </h2>
      <p className="mt-2 text-sm leading-6 text-foreground-subtle">
        {language === "AR"
          ? "يتم إعادة نفس تكلفة الاستبدال إلى رصيد العميل مع الاحتفاظ بالسجل الأصلي وإنشاء عملية عكس مرتبطة به."
          : "The exact redeemed cost is restored to the customer balance while the original history is preserved and a linked reversal is created."}
      </p>

      {reversible.length === 0 ? (
        <p className="mt-6 rounded-[var(--lf-radius-input)] bg-surface-subtle px-4 py-4 text-sm text-foreground-muted">
          {language === "AR"
            ? "لا توجد عمليات استبدال حديثة قابلة للعكس ضمن السجل المعروض."
            : "There are no recent reward redemptions eligible for reversal in the displayed history."}
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {reversible.map((redemption) => {
            const transaction = redemption.transaction!;
            const action = reverseRedemptionAction.bind(null, businessSlug, customerId);
            const formattedCost = formatLoyaltyAmount({
              loyaltyMode: transaction.sourceLoyaltyMode ?? "VISITS",
              language,
              unitName,
              currency,
              amount: redemption.cost,
            });

            return (
              <article
                key={redemption.id}
                className="rounded-[var(--lf-radius-card)] border border-border bg-surface-subtle p-4"
              >
                <div>
                  <p dir="auto" className="font-bold text-foreground">
                    {redemption.rewardName} · {formattedCost}
                  </p>
                  <p className="mt-1 text-xs text-foreground-subtle">
                    {redemption.createdAt.toLocaleString(language === "AR" ? "ar-EG" : "en-US")}
                  </p>
                </div>

                <details className="mt-4 rounded-[var(--lf-radius-input)] border border-danger/20 bg-white">
                  <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-danger">
                    {language === "AR" ? "عكس هذا الاستبدال" : "Reverse this redemption"}
                  </summary>
                  <form action={action} className="space-y-3 border-t border-border p-4">
                    <input type="hidden" name="originalRedemptionId" value={redemption.id} />
                    <input type="hidden" name="originalTransactionId" value={transaction.id} />
                    <input type="hidden" name="operationId" value={randomUUID()} />
                    <input type="hidden" name="restoreUnlock" value="false" />

                    <p className="text-sm leading-6 text-foreground-muted">
                      {language === "AR"
                        ? `سيتم إعادة ${formattedCost} إلى الرصيد. لن يتم حذف عملية الاستبدال الأصلية.`
                        : `${formattedCost} will be restored to the balance. The original redemption will not be deleted.`}
                    </p>

                    <label className="block text-sm font-medium text-foreground-muted">
                      {language === "AR" ? "سبب العكس" : "Reversal reason"}
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
                      {language === "AR" ? "تأكيد عكس الاستبدال" : "Confirm redemption reversal"}
                    </button>
                  </form>
                </details>
              </article>
            );
          })}
        </div>
      )}

      <p className="mt-6 text-xs leading-5 text-foreground-subtle">
        {language === "AR"
          ? "إعادة فتح Reward Unlock غير مفعلة في هذه الواجهة حاليًا؛ هذه العملية تعيد رصيد الولاء فقط."
          : "Reward unlock restoration is not enabled in this UI yet; this action restores loyalty balance only."}
      </p>
    </section>
  );
}
