import { formatLoyaltyAmount } from "@/lib/loyalty/presentation";

type RewardType =
  | "GIFT"
  | "PROMO_CODE"
  | "DISCOUNT"
  | "CUSTOM";

type SalesProgressPanelProps = {
  currentAmount: number;
  targetAmount: number;
  currency: string | null;
  rewardName: string;
  rewardType: RewardType;
  rewardCode: string | null;
  rewardDescription: string | null;
  primaryColor: string;
  defaultLanguage: "AR" | "EN";
};

const dictionary = {
  AR: {
    purchases: "إجمالي مشتريات العميل",
    target: "الهدف",
    reached: "🎉 تم الوصول إلى الهدف",
    remaining: "المتبقي للوصول إلى المكافأة",
    reward: "الجائزة",
    promo: "كود خصم",
    discount: "خصم",
    custom: "مكافأة مخصصة",
    gift: "هدية",
    promoCode: "Promo Code",
  },
  EN: {
    purchases: "Customer purchases",
    target: "Target",
    reached: "🎉 Reward target reached",
    remaining: "Remaining to unlock reward",
    reward: "Reward",
    promo: "Promo code",
    discount: "Discount",
    custom: "Custom reward",
    gift: "Gift",
    promoCode: "Promo Code",
  },
} as const;

function getRewardTypeLabel(
  language: "AR" | "EN",
  rewardType: RewardType
) {
  const text = dictionary[language];

  switch (rewardType) {
    case "PROMO_CODE":
      return text.promo;

    case "DISCOUNT":
      return text.discount;

    case "CUSTOM":
      return text.custom;

    default:
      return text.gift;
  }
}

export default function SalesProgressPanel({
  currentAmount,
  targetAmount,
  currency,
  rewardName,
  rewardType,
  rewardCode,
  rewardDescription,
  primaryColor,
  defaultLanguage,
}: SalesProgressPanelProps) {
  const text = dictionary[defaultLanguage];

  const safeTarget = Math.max(1, targetAmount);

  const rewardAvailable =
    currentAmount >= safeTarget;

  const remaining =
    Math.max(0, safeTarget - currentAmount);

  const progress = Math.min(
    100,
    Math.floor((currentAmount / safeTarget) * 100)
  );

  function formatAmount(amount: number) {
    return formatLoyaltyAmount({
      loyaltyMode: "SALES_AMOUNT",
      language: defaultLanguage,
      unitName: null,
      currency,
      amount,
    });
  }

  return (
    <section
      dir={defaultLanguage === "AR" ? "rtl" : "ltr"}
      className="mb-6 overflow-hidden rounded-[var(--lf-radius-card)] border border-white/10 bg-white shadow-xl"
    >
      <div
        className="p-6 text-white sm:p-6"
        style={{
          background:
            `linear-gradient(135deg, ${primaryColor}, #0f172a)`,
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black text-white/65">
              {text.purchases}
            </p>

            <p className="mt-2 text-2xl font-black">
              {formatAmount(currentAmount)}
            </p>
          </div>

          <span className="rounded-full bg-white/15 px-4 py-1.5 text-xs font-black">
            {progress}%
          </span>
        </div>

        <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-white transition-all"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>

        <div className="mt-4 flex justify-between text-xs font-bold text-white/75">
          <span>{formatAmount(currentAmount)}</span>

          <span>
            {text.target}: {formatAmount(safeTarget)}
          </span>
        </div>
      </div>

      <div className="p-6 sm:p-6">
        {rewardAvailable ? (
          <div className="rounded-[var(--lf-radius-card)] border border-success/30 bg-success-subtle p-4 text-center">
            <p className="text-sm font-black text-success">
              {text.reached}
            </p>

            <p className="mt-2 text-xl font-black text-success">
              {rewardName}
            </p>

            <p className="text-xs font-bold text-success">
              {getRewardTypeLabel(
                defaultLanguage,
                rewardType
              )}
            </p>

            {rewardDescription && (
              <p className="mt-4 text-sm">
                {rewardDescription}
              </p>
            )}

            {rewardType === "PROMO_CODE" &&
              rewardCode && (
                <div className="mt-4 rounded-[var(--lf-radius-input)] bg-white p-4">
                  <p className="text-xs font-black">
                    {text.promoCode}
                  </p>

                  <p className="text-2xl font-black">
                    {rewardCode}
                  </p>
                </div>
              )}
          </div>
        ) : (
          <div className="rounded-[var(--lf-radius-card)] bg-surface-subtle p-4 text-center">
            <p className="text-sm font-bold text-foreground-subtle">
              {text.remaining}
            </p>

            <p className="mt-2 text-2xl font-black">
              {formatAmount(remaining)}
            </p>

            <p className="mt-2 font-bold text-primary">
              {text.reward}: {rewardName}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}