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
import { formatWebsiteForCard } from "@/lib/urls/business-url";

export type LoyaltyCardProps = StandardLoyaltyCardProps & {
  designMode?: string | null;
  customDesignEnabled?: boolean;
  customFrontArtworkUrl?: string | null;
  customBackArtworkUrl?: string | null;
  customSafeZoneVersion?: string | null;
};

function CustomQr({ src }: { src?: string | null }) {
  if (src) return <img src={src} alt="Customer loyalty QR code" className="size-full bg-white object-contain" />;
  return (
    <div className="grid size-full grid-cols-5 gap-[5%] bg-white p-[10%]" aria-label="Preview QR code">
      {Array.from({ length: 25 }, (_, index) => (
        <span key={index} className={index % 2 === 0 || [1, 5, 9, 13, 17, 21].includes(index) ? "bg-slate-950" : "bg-white"} />
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

function CustomLoyaltyCard(props: LoyaltyCardProps) {
  const side = props.side ?? "front";
  const language = props.language ?? "EN";
  const dir = language === "AR" ? "rtl" : "ltr";
  const metrics = getLoyaltyCardMetrics({ ...props, language });
  const artworkUrl = side === "front" ? props.customFrontArtworkUrl : props.customBackArtworkUrl;
  const accent = readableAccentOnDark(props.primaryColor);
  const labels = language === "AR"
    ? { member: "اسم العضو", id: "رقم العضوية", balance: "الرصيد", reward: "المكافأة القادمة" }
    : { member: "MEMBER NAME", id: "LOYALTY ID", balance: "BALANCE", reward: "NEXT REWARD" };
  const website = formatWebsiteForCard(props.businessWebsite);
  const location = props.businessLocation || props.businessAddress;
  const contactItems = [props.businessPhone, website, location].filter(
    (value): value is string => Boolean(value),
  );

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
      <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-black/55" />

      {side === "front" ? (
        <div dir={dir} className="relative grid h-full grid-cols-[minmax(0,1fr)_25%] grid-rows-[auto_1fr_auto] gap-x-[5cqw] p-[6.8cqw]">
          <div
            data-safe-zone="custom-brand"
            className="min-w-0 w-fit max-w-full rounded-[2cqw] border border-white/15 bg-black/60 px-[2.5cqw] py-[1.8cqw] backdrop-blur-sm"
          >
            <p dir="auto" title={props.businessName} className="truncate text-[3.7cqw] font-black tracking-[0.06em]">{props.businessName}</p>
            <p className="mt-[1cqw] text-[1.45cqw] font-bold tracking-[0.22em]" style={{ color: accent }}>LOYALTY CARD</p>
          </div>
          <div data-safe-zone="custom-qr" className="justify-self-end">
            <div className="size-[18cqw] overflow-hidden rounded-[2cqw] bg-white p-[0.7cqw] shadow-xl">
              <CustomQr src={props.qrCode} />
            </div>
          </div>
          <div
            data-safe-zone="custom-member"
            className="col-span-2 w-fit max-w-[72%] self-end rounded-[2cqw] border border-white/15 bg-black/60 px-[2.5cqw] py-[2cqw] backdrop-blur-sm"
          >
            <p className="text-[1.5cqw] font-bold tracking-[0.18em]" style={{ color: accent }}>{labels.member}</p>
            <p dir="auto" title={props.customerName} className="mt-[1cqw] max-w-[62%] truncate text-[4.2cqw] font-black">{props.customerName}</p>
            <p className="mt-[2cqw] text-[1.5cqw] font-bold tracking-[0.18em]" style={{ color: accent }}>{labels.id}</p>
            <p dir="ltr" className="mt-[0.7cqw] truncate text-[2.8cqw] font-semibold tracking-[0.12em]">{props.customerId.slice(0, 32)}</p>
          </div>
          <section data-safe-zone="custom-balance" className="col-span-2 mt-[3cqw] flex items-end justify-between gap-[4cqw] rounded-[2.5cqw] border border-white/20 bg-black/35 px-[3.5cqw] py-[2.7cqw] backdrop-blur-sm">
            <div className="min-w-0">
              <p className="text-[1.4cqw] font-bold tracking-[0.16em]" style={{ color: accent }}>{labels.balance}</p>
              <p dir="auto" aria-label={metrics.semanticCurrentText} title={metrics.semanticCurrentText} className="mt-[0.8cqw] truncate text-[3.7cqw] font-black">{metrics.currentText}</p>
            </div>
            <div className="min-w-0 flex-1">
              <div className="h-[1.5cqw] overflow-hidden rounded-full bg-white/20">
                <div className="h-full rounded-full" style={{ width: `${metrics.progress}%`, backgroundColor: accent }} />
              </div>
              <p dir="auto" aria-label={metrics.semanticRemainingText} title={metrics.semanticRemainingText} className="mt-[1.2cqw] truncate text-[1.45cqw] font-bold">{metrics.remainingText}</p>
            </div>
          </section>
        </div>
      ) : (
        <div dir={dir} className="relative flex h-full flex-col justify-between p-[6.8cqw]">
          <div
            data-safe-zone="custom-back-brand"
            className="w-fit max-w-full rounded-[2cqw] border border-white/15 bg-black/60 px-[2.5cqw] py-[1.8cqw] backdrop-blur-sm"
          >
            <p dir="auto" title={props.businessName} className="truncate text-[3.4cqw] font-black tracking-[0.06em]">{props.businessName}</p>
          </div>
          <section
            data-safe-zone="custom-reward"
            className="max-w-[72%] rounded-[2.5cqw] border border-white/15 bg-black/60 px-[3cqw] py-[2.5cqw] backdrop-blur-sm"
          >
            <p className="text-[1.6cqw] font-bold tracking-[0.2em]" style={{ color: accent }}>{labels.reward}</p>
            <p dir="auto" title={props.rewardName} className="mt-[1.8cqw] line-clamp-2 break-words text-[4.2cqw] font-black leading-tight">{props.rewardName.slice(0, 32)}</p>
            <p dir="auto" aria-label={metrics.semanticRemainingText} title={metrics.semanticRemainingText} className="mt-[2cqw] truncate text-[1.8cqw] font-bold">{metrics.remainingText}</p>
            <div className="mt-[2.3cqw] h-[1.6cqw] overflow-hidden rounded-full bg-white/20">
              <div className="h-full rounded-full" style={{ width: `${metrics.progress}%`, backgroundColor: accent }} />
            </div>
            <p dir="auto" aria-label={metrics.semanticRatioText} title={metrics.semanticRatioText} className="mt-[1.4cqw] truncate text-[1.6cqw] font-semibold">{metrics.ratioText}</p>
          </section>
          <div className="flex min-w-0 items-end justify-between gap-[3cqw] text-[1.35cqw] font-semibold text-white/70">
            {contactItems.length ? (
              <p dir="auto" title={contactItems.join(" · ")} className="min-w-0 truncate">{contactItems.join(" · ")}</p>
            ) : <span />}
            <p className="shrink-0">LOYALFLOW · Loyalty programme terms apply</p>
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
  return useCustom
    ? <CustomLoyaltyCard {...props} side={side} />
    : <StandardLoyaltyCard {...props} side={side} />;
}

export function LoyaltyCard(props: LoyaltyCardProps) {
  const side = props.side ?? "front";
  const useCustom =
    cardDesignMode(props.designMode) === "CUSTOM" &&
    props.customDesignEnabled === true &&
    Boolean(props.customFrontArtworkUrl && props.customBackArtworkUrl);

  return (
    <div
      data-testid="loyalty-card-flip"
      data-card-side={side}
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
          <LoyaltyCardFace side="front" useCustom={useCustom} props={props} />
        </div>
        <div
          className="[grid-area:1/1] [backface-visibility:hidden] [transform:rotateY(180deg)]"
          aria-hidden={side !== "back"}
        >
          <LoyaltyCardFace side="back" useCustom={useCustom} props={props} />
        </div>
      </div>
    </div>
  );
}
