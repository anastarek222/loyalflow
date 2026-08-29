/* eslint-disable @next/next/no-img-element */
import type { CSSProperties } from "react";
import {
  CUSTOM_CARD_SAFE_ZONE_VERSION,
  STANDARD_CARD_ASPECT_RATIO,
  cardDesignMode,
  getLoyaltyCardMetrics,
} from "@/lib/cards/standard-card";
import {
  CUSTOM_CARD_BACK_REWARD_ZONE,
  CUSTOM_CARD_BACK_SCORE_ZONE,
  CUSTOM_CARD_FRONT_BALANCE_ZONE,
  CUSTOM_CARD_FRONT_MEMBER_ZONE,
  CUSTOM_CARD_FRONT_QR_CONTENT_ZONE,
  CUSTOM_CARD_FRONT_QR_ZONE,
  LOYALTY_CARD_CANVAS,
  type LoyaltyCardZone,
} from "@/lib/cards/card-rendering-contract";
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
  showSafeZones?: boolean;
};

// The loyalty card is a product object, not a localized dashboard surface.
// UI shells may be Arabic or English, but switching their language must never
// change card geometry, labels, direction, QR placement, or reward layout.
export const CARD_PRESENTATION_LANGUAGE = "EN" as const;

function zoneStyle(zone: LoyaltyCardZone): CSSProperties {
  return {
    left: `${(zone.x / LOYALTY_CARD_CANVAS.width) * 100}%`,
    top: `${(zone.y / LOYALTY_CARD_CANVAS.height) * 100}%`,
    width: `${(zone.width / LOYALTY_CARD_CANVAS.width) * 100}%`,
    height: `${(zone.height / LOYALTY_CARD_CANVAS.height) * 100}%`,
  };
}

function cardColor(value: string | null | undefined, fallback: string) {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function CustomQr({ src, label }: { src?: string | null; label: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt={label}
        className="size-full bg-white object-contain"
      />
    );
  }

  return (
    <div
      className="grid size-full grid-cols-5 gap-[5%] bg-white p-[10%]"
      aria-label={label}
    >
      {Array.from({ length: 25 }, (_, index) => (
        <span
          key={index}
          className={
            index % 2 === 0 || [1, 5, 9, 13, 17, 21].includes(index)
              ? "bg-slate-950"
              : "bg-white"
          }
        />
      ))}
    </div>
  );
}

function GiftMark({ accent }: { accent: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className="size-[9cqw] shrink-0 drop-shadow-[0_2px_3px_rgba(0,0,0,0.75)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ color: accent }}
    >
      <path d="M10 27h44v27H10z" />
      <path d="M7 18h50v10H7z" />
      <path d="M32 18v36" />
      <path d="M32 18c-7 0-14-2-14-8 0-4 3-6 7-6 5 0 7 5 7 14Z" />
      <path d="M32 18c7 0 14-2 14-8 0-4-3-6-7-6-5 0-7 5-7 14Z" />
    </svg>
  );
}

function CustomLoyaltyCard(props: LoyaltyCardProps) {
  const side = props.side ?? "front";
  const language = props.language ?? CARD_PRESENTATION_LANGUAGE;
  const metrics = getLoyaltyCardMetrics({ ...props, language });
  const artworkUrl =
    side === "front"
      ? props.customFrontArtworkUrl
      : props.customBackArtworkUrl;
  const labels =
    language === "AR"
      ? { qr: "رمز QR الخاص بالعميل" }
      : { qr: "Customer loyalty QR code" };
  const guideOutline = props.showSafeZones
    ? "outline outline-[0.45cqw] outline-offset-[-0.45cqw] outline-sky-400"
    : "";
  const accent = cardColor(props.primaryColor, "#3B82F6");
  const secondary = cardColor(props.secondaryColor, "#FFFFFF");
  const progress = Math.max(0, Math.min(100, metrics.progress));

  return (
    <article
      data-testid={`custom-card-${side}`}
      data-card-aspect-ratio={STANDARD_CARD_ASPECT_RATIO.toFixed(3)}
      data-safe-zone-version={
        props.customSafeZoneVersion || CUSTOM_CARD_SAFE_ZONE_VERSION
      }
      className="relative w-full overflow-hidden rounded-[5.2%] bg-slate-950 text-white shadow-[0_24px_55px_-28px_rgba(15,23,42,0.8)]"
      style={{
        aspectRatio: String(STANDARD_CARD_ASPECT_RATIO),
        containerType: "inline-size",
      }}
    >
      {artworkUrl ? (
        <img
          src={artworkUrl}
          alt=""
          className="absolute inset-0 size-full bg-slate-950 object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,#334155_0,transparent_36%),linear-gradient(135deg,#18181b,#020617)]" />
      )}

      {side === "front" ? (
        <div className="absolute inset-0">
          <div
            data-safe-zone="custom-qr"
            className={`absolute rounded-[10%] bg-white shadow-xl ${guideOutline}`}
            style={zoneStyle(CUSTOM_CARD_FRONT_QR_ZONE)}
          />
          <div
            className="absolute overflow-hidden bg-white"
            style={zoneStyle(CUSTOM_CARD_FRONT_QR_CONTENT_ZONE)}
          >
            <CustomQr src={props.qrCode} label={labels.qr} />
          </div>

          <div
            data-safe-zone="custom-member"
            className={`absolute flex min-w-0 items-end ${guideOutline}`}
            style={zoneStyle(CUSTOM_CARD_FRONT_MEMBER_ZONE)}
          >
            <p
              dir="auto"
              title={props.customerName}
              className="w-full truncate pb-[3cqw] text-[4.2cqw] font-black text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.95)]"
            >
              {props.customerName}
            </p>
          </div>

          <div
            data-safe-zone="custom-balance"
            className={`absolute flex min-w-0 items-end justify-end ${guideOutline}`}
            style={zoneStyle(CUSTOM_CARD_FRONT_BALANCE_ZONE)}
          >
            <p
              dir="auto"
              aria-label={metrics.semanticCurrentText}
              title={metrics.semanticCurrentText}
              className="w-full truncate pb-[3cqw] text-right text-[3.7cqw] font-black text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.95)]"
            >
              {metrics.currentText}
            </p>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0">
          <div
            data-safe-zone="custom-reward"
            className={`absolute min-w-0 ${guideOutline}`}
            style={zoneStyle(CUSTOM_CARD_BACK_REWARD_ZONE)}
          >
            <div className="flex h-full min-w-0 items-center gap-[2.4cqw]">
              <GiftMark accent={accent} />
              <p
                dir="auto"
                title={props.rewardName}
                className="line-clamp-2 min-w-0 flex-1 break-words text-[4.2cqw] font-black leading-tight text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.95)]"
              >
                {props.rewardName.slice(0, 32)}
              </p>
            </div>
          </div>

          <div
            data-safe-zone="custom-score"
            className={`absolute flex min-w-0 flex-col justify-center ${guideOutline}`}
            style={zoneStyle(CUSTOM_CARD_BACK_SCORE_ZONE)}
          >
            <div
              data-safe-zone="custom-progress"
              className="h-[1.6cqw] w-full overflow-hidden rounded-full bg-black/35 ring-1 ring-white/35"
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${progress}%`,
                  background: `linear-gradient(90deg, ${accent}, ${secondary})`,
                }}
              />
            </div>
            <p
              dir="auto"
              aria-label={metrics.semanticRatioText}
              title={metrics.semanticRatioText}
              className="mt-[1.8cqw] w-full truncate text-[3.1cqw] font-black text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.95)]"
            >
              {metrics.ratioText}
            </p>
          </div>
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
  return useCustom ? (
    <CustomLoyaltyCard {...props} side={side} />
  ) : (
    <StandardLoyaltyCard {...props} side={side} />
  );
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
    (cardProps.showSafeZones === true ||
      Boolean(
        cardProps.customFrontArtworkUrl && cardProps.customBackArtworkUrl,
      ));

  return (
    <div
      data-testid="loyalty-card-flip"
      data-card-side={side}
      data-card-presentation-language={CARD_PRESENTATION_LANGUAGE}
      className="w-full [perspective:1200px]"
    >
      <div
        className="grid transition-transform duration-500 [transform-style:preserve-3d] motion-reduce:transition-none"
        style={{
          transform: side === "back" ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
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
