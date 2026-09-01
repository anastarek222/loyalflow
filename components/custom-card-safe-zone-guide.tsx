import {
  LoyaltyCard,
  type LoyaltyCardProps,
} from "@/components/loyalty-card";
import { LOYALTY_CARD_CANVAS } from "@/lib/cards/card-rendering-contract";

type Props = {
  isArabic: boolean;
  preview: Pick<
    LoyaltyCardProps,
    | "businessName"
    | "primaryColor"
    | "secondaryColor"
    | "customerName"
    | "customerId"
    | "balance"
    | "loyaltyMode"
    | "unitName"
    | "currency"
    | "rewardName"
    | "rewardThreshold"
  >;
};

export function CustomCardSafeZoneGuide({ isArabic, preview }: Props) {
  const t = (ar: string, en: string) => (isArabic ? ar : en);
  const guideCard = {
    ...preview,
    designMode: "CUSTOM",
    customDesignEnabled: true,
    showSafeZones: true,
  } as const;

  return (
    <details
      open
      className="mt-5 rounded-2xl border border-sky-200 bg-sky-50/70 p-4"
    >
      <summary className="cursor-pointer font-black text-foreground">
        {t(
          "دليل تجهيز التصميم · المناطق المحجوزة",
          "Artwork template · protected zones",
        )}
      </summary>
      <p className="mt-2 text-sm leading-6 text-foreground-muted">
        {t(
          "صمّم كل ما يخص البراند داخل صورة البطاقة، واترك المناطق المحددة بالأزرق خالية. تاني يضع فيها بيانات كل عميل تلقائيًا بنفس المواضع عند المعاينة والنشر.",
          "Design every brand element inside the artwork and leave the blue outlined zones clear. Tanee fills them with each customer’s live data in the same positions during preview and after publishing.",
        )}
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <figure className="min-w-0">
          <figcaption className="mb-2 text-xs font-black uppercase tracking-wide text-foreground-muted">
            {t("الواجهة · QR + اسم العميل + الرصيد", "Front · QR + customer name + balance")}
          </figcaption>
          <LoyaltyCard {...guideCard} side="front" />
        </figure>
        <figure className="min-w-0">
          <figcaption className="mb-2 text-xs font-black uppercase tracking-wide text-foreground-muted">
            {t("الخلفية · المكافأة + النتيجة", "Back · reward + score")}
          </figcaption>
          <LoyaltyCard {...guideCard} side="back" />
        </figure>
      </div>

      <div className="mt-4 rounded-xl border border-sky-200 bg-white p-3 text-xs leading-5 text-foreground-muted">
        {t(
          `قالب التصميم المقترح: ${LOYALTY_CARD_CANVAS.width} × ${LOYALTY_CARD_CANVAS.height} بكسل. تُقبل المقاسات الأكبر بنفس نسبة ID-1 ‏(1.586:1)، ويجب أن تتطابق أبعاد الواجهة والخلفية. الخطوط الزرقاء إرشادية فقط ولا تظهر على بطاقة العميل.`,
          `Recommended design canvas: ${LOYALTY_CARD_CANVAS.width} × ${LOYALTY_CARD_CANVAS.height} px. Larger files are accepted at the same ID-1 ratio (1.586:1), and Front and Back pixel dimensions must match. Blue outlines are guides only and never appear on the customer card.`,
        )}
      </div>
    </details>
  );
}
