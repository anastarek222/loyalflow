type RewardType =
  | "GIFT"
  | "PROMO_CODE"
  | "DISCOUNT"
  | "CUSTOM";

type SalesProgressPanelProps = {
  currentAmount: number;
  targetAmount: number;
  unitName: string;
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
  unitName,
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

  const numberFormatter =
    new Intl.NumberFormat(
      defaultLanguage === "AR" ? "ar-EG" : "en-US",
      {
        maximumFractionDigits: 0,
      }
    );

  function formatAmount(amount: number) {
    return `${numberFormatter.format(amount)} ${unitName}`;
  }

  return (
    <section
      dir={defaultLanguage === "AR" ? "rtl" : "ltr"}
      className="mb-5 overflow-hidden rounded-3xl border border-white/10 bg-white shadow-xl"
    >
      <div
        className="p-5 text-white sm:p-6"
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

          <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-black">
            {progress}%
          </span>
        </div>

        <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-white transition-all"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>

        <div className="mt-3 flex justify-between text-xs font-bold text-white/75">
          <span>{formatAmount(currentAmount)}</span>

          <span>
            {text.target}: {formatAmount(safeTarget)}
          </span>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {rewardAvailable ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
            <p className="text-sm font-black text-emerald-700">
              {text.reached}
            </p>

            <p className="mt-2 text-xl font-black text-emerald-950">
              {rewardName}
            </p>

            <p className="text-xs font-bold text-emerald-700">
              {getRewardTypeLabel(
                defaultLanguage,
                rewardType
              )}
            </p>

            {rewardDescription && (
              <p className="mt-3 text-sm">
                {rewardDescription}
              </p>
            )}

            {rewardType === "PROMO_CODE" &&
              rewardCode && (
                <div className="mt-4 rounded-xl bg-white p-3">
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
          <div className="rounded-2xl bg-slate-50 p-4 text-center">
            <p className="text-sm font-bold text-slate-500">
              {text.remaining}
            </p>

            <p className="mt-2 text-2xl font-black">
              {formatAmount(remaining)}
            </p>

            <p className="mt-2 font-bold text-violet-700">
              {text.reward}: {rewardName}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}