/* eslint-disable @next/next/no-img-element */
import {
  CUSTOM_CARD_SAFE_ZONE_VERSION,
  STANDARD_CARD_ASPECT_RATIO,
  cardDesignMode,
  getLoyaltyCardMetrics,
} from "@/lib/cards/standard-card";
import {
  StandardLoyaltyCard,
  type StandardLoyaltyCardProps,
} from "@/components/standard-loyalty-card";

export type LoyaltyCardProps = StandardLoyaltyCardProps & {
  designMode?: string | null;
  customDesignEnabled?: boolean;
  customFrontArtworkUrl?: string | null;
  customBackArtworkUrl?: string | null;
  customSafeZoneVersion?: string | null;
};

// The loyalty card is a product object, not a localized dashboard surface.
// UI shells may be Arabic or English, but switching their language must never
// change card geometry, labels, direction, QR placement, or reward layout.
export const CARD_PRESENTATION_LANGUAGE = "EN" as const;

function CustomQr({ src, label }: { src?: string | null; label: string }) {
  if (src) return <img src={src} alt={label} className="size-full bg-white object-contain" />;
  return (
    <div className="grid size-full grid-cols-5 gap-[5%] bg-white p-[10%]" aria-label={label}>
      {Array.from({ length: 25 }, (_, index) => (
        <span key={index} className={index % 2 === 0 || [1, 5, 9, 13, 17, 21].includes(index) ? "bg-slate-950" : "bg-white"} />
      ))}
    </div>
  );
}

function CustomLoyaltyCard(props: LoyaltyCardProps) {
  const side = props.side ?? "front";
  const language = props.language ?? CARD_PRESENTATION_LANGUAGE;
  const metrics = getLoyaltyCardMetrics({ ...props, language });
  const artworkUrl = side === "front" ? props.customFrontArtworkUrl : props.customBackArtworkUrl;
  const labels = language === "AR"
    ? { qr: "رمز QR الخاص بالعميل" }
    : { qr: "Customer loyalty QR code" };

  return (
    <article
      data-testid={`custom-card-${side}`}
      data-card-aspect-ratio="1.586"
      data-safe-zone-version={props.customSafeZoneVersion || CUSTOM_CARD_SAFE_ZONE_VERSION}
      className="relative w-full overflow-hidden rounded-[5.2cqw] border border-white/20 bg-slate-950 text-white shadow-[0_24px_55px_-28px_rgba(15,23,42,0.9)]"
      style={{ aspectRatio: String(STANDARD_CARD_ASPECT_RATIO), containerType: "inline-size" }}
    >
      {artworkUrl ? (
        <img src={artworkUrl} alt="" className="absolute inset-0 size-full bg-slate-950 object-contain" />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,#334155_0,transparent_36%),linear-gradient(135deg,#18181b,#020617)]" />
      )}
      {side === "front" ? (
        <div className="relative h-full">
          <div data-safe-zone="custom-qr" className="absolute right-[6.8cqw] top-[6.8cqw]">
            <div className="size-[18cqw] overflow-hidden rounded-[2cqw] bg-white p-[0.7cqw] shadow-xl">
              <CustomQr src={props.qrCode} label={labels.qr} />
            </div>
          </div>
          <p
            data-safe-zone="custom-member"
            dir="auto"
            title={props.customerName}
            className="absolute bottom-[7cqw] left-[6.8cqw] max-w-[50%] truncate text-[4.2cqw] font-black text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.95)]"
          >
            {props.customerName}
          </p>
          <p
            data-safe-zone="custom-balance"
            dir="auto"
            aria-label={metrics.semanticCurrentText}
            title={metrics.semanticCurrentText}
            className="absolute bottom-[7cqw] right-[6.8cqw] max-w-[32%] truncate text-right text-[3.7cqw] font-black text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.95)]"
          >
            {metrics.currentText}
          </p>
        </div>
      ) : (
        <div className="relative h-full">
          <p
            data-safe-zone="custom-reward"
            dir="auto"
            title={props.rewardName}
            className="absolute bottom-[7cqw] left-[6.8cqw] line-clamp-2 max-w-[50%] break-words text-[4.2cqw] font-black leading-tight text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.95)]"
          >
            {props.rewardName.slice(0, 32)}
          </p>
          <p
            data-safe-zone="custom-score"
            dir="auto"
            aria-label={metrics.semanticRatioText}
            title={metrics.semanticRatioText}
            className="absolute bottom-[7cqw] right-[6.8cqw] max-w-[32%] truncate text-right text-[3.4cqw] font-black text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.95)]"
          >
            {metrics.ratioText}
          </p>
        </div>
      )}
    </article>
  );
}

function LoyaltyCardFace({
  side,
  useCustom,
  props,
}: {
  side: "front" | "back";
  useCustom: boolean;
  props: LoyaltyCardProps;
}) {
  return useCustom
    ? <CustomLoyaltyCard {...props} side={side} />
    : <StandardLoyaltyCard {...props} side={side} />;
}

export function LoyaltyCard(props: LoyaltyCardProps) {
  const side = props.side ?? "front";
  const cardProps: LoyaltyCardProps = {
    ...props,
    language: CARD_PRESENTATION_LANGUAGE,
  };
  const useCustom =
    cardDesignMode(cardProps.designMode) === "CUSTOM" &&
    cardProps.customDesignEnabled === true &&
    Boolean(
      cardProps.customFrontArtworkUrl && cardProps.customBackArtworkUrl,
    );

  return (
    <div
      data-testid="loyalty-card-flip"
      data-card-side={side}
      data-card-presentation-language={CARD_PRESENTATION_LANGUAGE}
      className="w-full [perspective:1200px]"
    >
      <div
        className="grid transition-transform duration-500 [transform-style:preserve-3d] motion-reduce:transition-none"
        style={{ transform: side === "back" ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        <div
          className="[grid-area:1/1] [backface-visibility:hidden]"
          aria-hidden={side !== "front"}
        >
          <LoyaltyCardFace side="front" useCustom={useCustom} props={cardProps} />
        </div>
        <div
          className="[grid-area:1/1] [backface-visibility:hidden] [transform:rotateY(180deg)]"
          aria-hidden={side !== "back"}
        >
          <LoyaltyCardFace side="back" useCustom={useCustom} props={cardProps} />
        </div>
      </div>
    </div>
  );
}
