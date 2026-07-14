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
};

function getRewardTypeLabel(
  rewardType: RewardType
) {
  switch (rewardType) {
    case "PROMO_CODE":
      return "كود خصم";

    case "DISCOUNT":
      return "خصم";

    case "CUSTOM":
      return "مكافأة مخصصة";

    case "GIFT":
    default:
      return "هدية";
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
}: SalesProgressPanelProps) {
  const safeTarget =
    Math.max(
      1,
      targetAmount
    );

  const rewardAvailable =
    currentAmount >=
    safeTarget;

  const remaining =
    Math.max(
      0,
      safeTarget -
        currentAmount
    );

  const progress =
    Math.min(
      100,
      Math.floor(
        (
          currentAmount /
          safeTarget
        ) *
          100
      )
    );

  const numberFormatter =
    new Intl.NumberFormat(
      "ar-EG",
      {
        maximumFractionDigits:
          0,
      }
    );

  function formatAmount(
    amount: number
  ) {
    return `${numberFormatter.format(
      amount
    )} ${unitName}`;
  }

  return (
    <section
      dir="rtl"
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
              إجمالي مشتريات العميل
            </p>

            <p
              dir="auto"
              className="mt-2 text-2xl font-black sm:text-3xl"
            >
              {formatAmount(
                currentAmount
              )}
            </p>
          </div>

          <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-black">
            {numberFormatter.format(
              progress
            )}
            %
          </span>
        </div>

        <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-white transition-all duration-700"
            style={{
              width:
                `${progress}%`,
            }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 text-xs font-bold text-white/75">
          <span>
            {formatAmount(
              currentAmount
            )}
          </span>

          <span>
            الهدف:{" "}
            {formatAmount(
              safeTarget
            )}
          </span>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {rewardAvailable ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
            <p className="text-sm font-black text-emerald-700">
              🎉 تم الوصول إلى الهدف
            </p>

            <p
              dir="auto"
              className="mt-2 text-xl font-black text-emerald-950"
            >
              {rewardName}
            </p>

            <p className="mt-1 text-xs font-bold text-emerald-700">
              {getRewardTypeLabel(
                rewardType
              )}
            </p>

            {rewardDescription && (
              <p
                dir="auto"
                className="mt-3 text-sm leading-6 text-emerald-800"
              >
                {
                  rewardDescription
                }
              </p>
            )}

            {rewardType ===
              "PROMO_CODE" &&
              rewardCode && (
                <div className="mt-4 rounded-xl border border-dashed border-emerald-400 bg-white p-3">
                  <p className="text-xs font-black text-emerald-600">
                    Promo Code
                  </p>

                  <p
                    dir="ltr"
                    className="mt-1 select-all text-2xl font-black tracking-widest text-emerald-950"
                  >
                    {rewardCode}
                  </p>
                </div>
              )}
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-50 p-4 text-center">
            <p className="text-sm font-bold text-slate-500">
              المتبقي للوصول إلى المكافأة
            </p>

            <p
              dir="auto"
              className="mt-2 text-2xl font-black text-slate-950"
            >
              {formatAmount(
                remaining
              )}
            </p>

            <p
              dir="auto"
              className="mt-2 text-sm font-bold text-violet-700"
            >
              الجائزة:{" "}
              {rewardName}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
