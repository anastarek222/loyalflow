/* eslint-disable @next/next/no-img-element */
import type { CSSProperties, ReactNode } from "react";
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
  secondaryColor?: string | null;
  designMode?: string | null;
  customDesignEnabled?: boolean;
  customFrontArtworkUrl?: string | null;
  customBackArtworkUrl?: string | null;
  customSafeZoneVersion?: string | null;
};

// The card itself is a product object, not localized page chrome. Public-page
// language switching must never translate or rearrange uploaded artwork or its
// protected dynamic zones.
export const CARD_PRESENTATION_LANGUAGE = "EN" as const;

function CustomQr({ src }: { src?: string | null }) {
  if (src) {
    return (
      <img
        src={src}
        alt="Customer loyalty QR code"
        className="size-full bg-white object-contain"
      />
    );
  }

  return (
    <div
      className="grid size-full grid-cols-5 gap-[5%] bg-white p-[10%]"
      aria-label="Customer loyalty QR code"
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

function readableAccentOnDark(color?: string | null) {
  const fallback = "#D5AE6E";
  if (!color || !/^#[0-9a-fA-F]{6}$/.test(color)) return fallback;

  const channels = [1, 3, 5].map((offset) =>
    Number.parseInt(color.slice(offset, offset + 2), 16),
  );
  const luminance =
    (channels[0] * 299 + channels[1] * 587 + channels[2] * 114) / 1000;
  if (luminance >= 145) return color;

  const lightened = channels.map((channel) =>
    Math.round(channel + (255 - channel) * 0.58),
  );
  return `#${lightened
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

function safeSecondaryColor(value?: string | null) {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value.toUpperCase() : "#60A5FA";
}

function StandardCardColorScope({
  secondaryColor,
  children,
}: {
  secondaryColor?: string | null;
  children: ReactNode;
}) {
  const style = {
    "--lf-card-secondary": safeSecondaryColor(secondaryColor),
  } as CSSProperties;

  return (
    <div data-standard-card-color-scope className="contents" style={style}>
      <style>{`
        [data-standard-card-color-scope] linearGradient[id$="-progress"] stop:last-child {
          stop-color: var(--lf-card-secondary) !important;
        }
        [data-standard-card-color-scope] [data-safe-zone="card-background"] > g {
          stroke: var(--lf-card-secondary) !important;
        }
      `}</style>
      {children}
    </div>
  );
}

function MissingCustomArtwork({ side }: { side: "front" | "back" }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-slate-950 px-[8cqw] text-center text-[2.2cqw] font-bold text-white/70">
      Custom {side} artwork is unavailable. Publish a complete Front + Back pair.
    </div>
  );
}

function CustomLoyaltyCard(props: LoyaltyCardProps) {
  const side = props.side ?? "front";
  const metrics = getLoyaltyCardMetrics({
    ...props,
    language: CARD_PRESENTATION_LANGUAGE,
  });
  const artworkUrl =
    side === "front"
      ? props.customFrontArtworkUrl
      : props.customBackArtworkUrl;
  const accent = readableAccentOnDark(props.primaryColor);

  return (
    <article
      dir="ltr"
      data-testid={`custom-card-${side}`}
      data-card-aspect-ratio="1.586"
      data-safe-zone-version={
        props.customSafeZoneVersion || CUSTOM_CARD_SAFE_ZONE_VERSION
      }
      className="relative w-full overflow-hidden rounded-[2.6cqw] border border-black/10 bg-slate-950 shadow-[0_18px_42px_-24px_rgba(15,23,42,0.65)]"
      style={{
        aspectRatio: String(STANDARD_CARD_ASPECT_RATIO),
        containerType: "inline-size",
      }}
    >
      {artworkUrl ? (
        <img
          src={artworkUrl}
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <MissingCustomArtwork side={side} />
      )}

      {artworkUrl && side === "front" ? (
        <div className="relative h-full w-full p-[5.6cqw]">
          <div
            data-safe-zone="custom-qr"
            className="absolute end-[5.6cqw] top-[5.6cqw] size-[17.5cqw] overflow-hidden rounded-[1.7cqw] bg-white p-[0.7cqw] shadow-[0_10px_28px_-14px_rgba(0,0,0,0.8)]"
          >
            <CustomQr src={props.qrCode} />
          </div>

          <div
            data-safe-zone="custom-member"
            className="absolute bottom-[22cqw] start-[5.6cqw] max-w-[58%] rounded-[1.8cqw] bg-black/62 px-[2.8cqw] py-[2.1cqw] shadow-lg backdrop-blur-[2px]"
          >
            <p
              dir="auto"
              title={props.customerName}
              className="truncate text-[4cqw] font-black leading-tight text-white"
            >
              {props.customerName}
            </p>
          </div>

          <section
            data-safe-zone="custom-balance"
            aria-label="Loyalty balance"
            className="absolute inset-x-[5.6cqw] bottom-[5.6cqw] rounded-[2cqw] bg-black/62 px-[3cqw] py-[2.5cqw] text-white shadow-lg backdrop-blur-[2px]"
          >
            <div className="flex min-w-0 items-end justify-between gap-[3cqw]">
              <p
                dir="auto"
                aria-label={metrics.semanticCurrentText}
                title={metrics.semanticCurrentText}
                className="max-w-[42%] truncate text-[3.5cqw] font-black"
              >
                {metrics.currentText}
              </p>
              <p
                dir="auto"
                aria-label={metrics.semanticRemainingText}
                title={metrics.semanticRemainingText}
                className="max-w-[52%] truncate text-end text-[1.55cqw] font-bold text-white/90"
              >
                {metrics.remainingText}
              </p>
            </div>
            <div className="mt-[1.7cqw] h-[1.25cqw] overflow-hidden rounded-full bg-white/28">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${metrics.progress}%`,
                  backgroundColor: accent,
                }}
              />
            </div>
          </section>
        </div>
      ) : null}

      {artworkUrl && side === "back" ? (
        <div className="relative h-full w-full p-[5.6cqw]">
          <section
            data-safe-zone="custom-reward"
            aria-label="Loyalty balance and next reward"
            className="absolute inset-x-[5.6cqw] bottom-[5.6cqw] rounded-[2.2cqw] bg-black/62 px-[3.2cqw] py-[2.9cqw] text-white shadow-lg backdrop-blur-[2px]"
          >
            <div className="flex min-w-0 items-end justify-between gap-[4cqw]">
              <div className="min-w-0 flex-1">
                <p
                  dir="auto"
                  title={props.rewardName}
                  className="line-clamp-2 break-words text-[3.8cqw] font-black leading-tight"
                >
                  {props.rewardName}
                </p>
                <p
                  dir="auto"
                  aria-label={metrics.semanticRemainingText}
                  title={metrics.semanticRemainingText}
                  className="mt-[1.4cqw] truncate text-[1.55cqw] font-bold text-white/90"
                >
                  {metrics.remainingText}
                </p>
              </div>
              <p
                dir="auto"
                aria-label={metrics.semanticCurrentText}
                title={metrics.semanticCurrentText}
                className="max-w-[38%] truncate text-end text-[3.2cqw] font-black"
              >
                {metrics.currentText}
              </p>
            </div>
            <div className="mt-[2cqw] h-[1.3cqw] overflow-hidden rounded-full bg-white/28">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${metrics.progress}%`,
                  backgroundColor: accent,
                }}
              />
            </div>
            <p
              dir="auto"
              aria-label={metrics.semanticRatioText}
              title={metrics.semanticRatioText}
              className="mt-[1.3cqw] truncate text-[1.45cqw] font-semibold text-white/85"
            >
              {metrics.ratioText}
            </p>
          </section>
        </div>
      ) : null}
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
  if (useCustom) return <CustomLoyaltyCard {...props} side={side} />;

  return (
    <StandardCardColorScope secondaryColor={props.secondaryColor}>
      <StandardLoyaltyCard {...props} side={side} />
    </StandardCardColorScope>
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
    cardProps.customDesignEnabled === true;

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
          transform:
            side === "back" ? "rotateY(180deg)" : "rotateY(0deg)",
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
