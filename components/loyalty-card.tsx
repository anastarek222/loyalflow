/* eslint-disable @next/next/no-img-element */
import {
  CUSTOM_CARD_SAFE_ZONE_VERSION,
  STANDARD_CARD_ASPECT_RATIO,
  cardDesignMode,
  getLoyaltyCardMetrics,
} from "@/lib/cards/standard-card";
import {
  LOYALTY_CARD_CANVAS,
  STANDARD_CARD_QR_CONTENT_ZONE,
  STANDARD_CARD_QR_ZONE,
} from "@/lib/cards/card-rendering-contract";
import {
  shouldStackStandardCardValue,
  standardCardDetailFontSize,
  standardCardValueFontSize,
} from "@/lib/cards/standard-card-text";
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

function safeColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#3B82F6";
}

function boundedText(value: string, maximum: number) {
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length <= maximum
    ? normalized
    : `${normalized.slice(0, maximum - 1).trimEnd()}…`;
}

function wrappedText(
  value: string,
  maximumPerLine: number,
  maximumLines: number,
) {
  const words = value.trim().replace(/\s+/g, " ").split(" ").filter(Boolean);
  const lines: string[] = [];

  for (const word of words) {
    const current = lines.at(-1) || "";
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maximumPerLine) {
      if (lines.length) lines[lines.length - 1] = candidate;
      else lines.push(candidate);
      continue;
    }
    if (lines.length >= maximumLines) break;
    lines.push(
      word.length <= maximumPerLine ? word : word.slice(0, maximumPerLine),
    );
  }

  const consumed = lines.join(" ").length;
  if (lines.length === maximumLines && consumed < value.trim().length) {
    lines[maximumLines - 1] =
      `${lines[maximumLines - 1].slice(0, maximumPerLine - 1).trimEnd()}…`;
  }

  return lines.length ? lines : [""];
}

function CustomQr({ src, label }: { src?: string | null; label: string }) {
  return (
    <g data-safe-zone="custom-qr" role="img" aria-label={label}>
      <rect
        x={STANDARD_CARD_QR_ZONE.x}
        y={STANDARD_CARD_QR_ZONE.y}
        width={STANDARD_CARD_QR_ZONE.width}
        height={STANDARD_CARD_QR_ZONE.height}
        rx="12"
        fill="#FFFFFF"
        stroke="#CBD5E1"
      />
      {src ? (
        <image
          href={src}
          x={STANDARD_CARD_QR_CONTENT_ZONE.x}
          y={STANDARD_CARD_QR_CONTENT_ZONE.y}
          width={STANDARD_CARD_QR_CONTENT_ZONE.width}
          height={STANDARD_CARD_QR_CONTENT_ZONE.height}
          preserveAspectRatio="xMidYMid meet"
        />
      ) : (
        <g transform={`translate(${STANDARD_CARD_QR_CONTENT_ZONE.x} ${STANDARD_CARD_QR_CONTENT_ZONE.y})`}>
          <rect
            width={STANDARD_CARD_QR_CONTENT_ZONE.width}
            height={STANDARD_CARD_QR_CONTENT_ZONE.height}
            fill="#FFFFFF"
          />
          <path
            transform={`scale(${STANDARD_CARD_QR_CONTENT_ZONE.width / 29})`}
            fill="#020617"
            d="M1 1h7v7H1zM3 3v3h3V3zM21 1h7v7h-7zM23 3v3h3V3zM1 21h7v7H1zM3 23v3h3v-3zM10 1h2v2h-2zM14 1h2v3h-2zM17 2h2v2h-2zM10 5h3v2h-3zM15 5h2v3h-2zM18 6h2v2h-2zM10 10h2v2h-2zM14 10h3v2h-3zM18 10h2v3h-2zM22 10h2v2h-2zM25 10h3v3h-3zM10 14h3v3h-3zM15 14h2v2h-2zM19 15h3v2h-3zM24 14h2v3h-2zM10 19h2v3h-2zM14 18h3v2h-3zM18 19h2v3h-2zM22 19h2v2h-2zM25 20h3v3h-3zM10 24h3v3h-3zM15 23h2v2h-2zM18 24h3v3h-3zM23 24h2v3h-2z"
          />
        </g>
      )}
    </g>
  );
}

function CustomSafeZoneGuides({ side }: { side: "front" | "back" }) {
  const shared = {
    fill: "none",
    stroke: "#38BDF8",
    strokeWidth: 3,
    strokeDasharray: "10 8",
  } as const;

  if (side === "front") {
    return (
      <g data-safe-zone="custom-guides" aria-hidden="true">
        <rect
          x={STANDARD_CARD_QR_ZONE.x}
          y={STANDARD_CARD_QR_ZONE.y}
          width={STANDARD_CARD_QR_ZONE.width}
          height={STANDARD_CARD_QR_ZONE.height}
          rx="12"
          {...shared}
        />
        <rect x="24" y="296" width="350" height="170" rx="20" {...shared} />
        <rect x="430" y="238" width="378" height="250" rx="22" {...shared} />
      </g>
    );
  }

  return (
    <g data-safe-zone="custom-guides" aria-hidden="true">
      <rect x="24" y="132" width="560" height="340" rx="22" {...shared} />
    </g>
  );
}

function CustomLoyaltyCard(props: LoyaltyCardProps) {
  const side = props.side ?? "front";
  const language = props.language ?? CARD_PRESENTATION_LANGUAGE;
  const metrics = getLoyaltyCardMetrics({ ...props, language });
  const artworkUrl =
    side === "front" ? props.customFrontArtworkUrl : props.customBackArtworkUrl;
  const accent = safeColor(props.primaryColor);
  const secondary = safeColor(props.secondaryColor || props.primaryColor);
  const stackCurrentValue = shouldStackStandardCardValue(
    metrics.currentAmountText,
    metrics.currentUnitText,
  );
  const progressWidth = Math.max(
    0,
    Math.min(334, (334 * metrics.progress) / 100),
  );
  const backProgressWidth = Math.max(
    0,
    Math.min(514, (514 * metrics.progress) / 100),
  );
  const rewardLines = wrappedText(
    props.rewardName || "Loyalty reward",
    34,
    3,
  );
  const customerNameIsArabic = /[\u0600-\u06FF]/.test(props.customerName);
  const customerNameX = customerNameIsArabic ? 355 : 42;
  const customerNameAnchor = customerNameIsArabic ? "end" : "start";
  const customerNameDirection = customerNameIsArabic ? "rtl" : "ltr";
  const labels =
    language === "AR"
      ? {
          qr: "رمز QR الخاص بالعميل",
          scan: "امسح للكسب",
          member: "اسم العضو",
          balance: "الرصيد الحالي",
          nextReward: "مكافأتك القادمة",
        }
      : {
          qr: "Customer loyalty QR code",
          scan: "SCAN TO EARN",
          member: "MEMBER NAME",
          balance: "CURRENT BALANCE",
          nextReward: "YOUR NEXT REWARD",
        };

  return (
    <article
      data-testid={`custom-card-${side}`}
      data-card-aspect-ratio={STANDARD_CARD_ASPECT_RATIO.toFixed(3)}
      data-safe-zone-version={
        props.customSafeZoneVersion || CUSTOM_CARD_SAFE_ZONE_VERSION
      }
      className="relative w-full overflow-hidden rounded-[5.2%] border border-white/20 bg-slate-950 text-white shadow-[0_24px_55px_-28px_rgba(15,23,42,0.9)]"
      style={{ aspectRatio: String(STANDARD_CARD_ASPECT_RATIO) }}
    >
      {artworkUrl ? (
        <img
          src={artworkUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 size-full bg-slate-950 object-contain"
          loading="eager"
          fetchPriority={side === "front" ? "high" : "auto"}
          decoding="async"
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,#334155_0,transparent_36%),linear-gradient(135deg,#18181b,#020617)]" />
      )}

      <svg
        viewBox={`0 0 ${LOYALTY_CARD_CANVAS.width} ${LOYALTY_CARD_CANVAS.height}`}
        width="100%"
        height="100%"
        direction="ltr"
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 size-full"
        aria-label={`${props.businessName} custom loyalty card ${side}`}
        role="img"
      >
        <defs>
          <linearGradient id={`custom-progress-${side}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={accent} />
            <stop offset="1" stopColor={secondary} />
          </linearGradient>
          <filter id={`custom-shadow-${side}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.85" />
          </filter>
        </defs>

        {side === "front" ? (
          <>
            <CustomQr src={props.qrCode} label={labels.qr} />
            <text
              x={STANDARD_CARD_QR_ZONE.x + STANDARD_CARD_QR_ZONE.width / 2}
              y={STANDARD_CARD_QR_ZONE.y + STANDARD_CARD_QR_ZONE.height + 19}
              fill="#FFFFFF"
              fontSize="11"
              fontWeight="800"
              letterSpacing="2"
              textAnchor="middle"
              filter={`url(#custom-shadow-${side})`}
            >
              {labels.scan}
            </text>

            <g data-safe-zone="custom-member">
              <rect
                x="24"
                y="296"
                width="350"
                height="170"
                rx="20"
                fill="#020617"
                opacity="0.58"
              />
              <text
                x={customerNameIsArabic ? 355 : 42}
                y="327"
                fill={accent}
                fontSize="13"
                fontWeight="800"
                letterSpacing={customerNameIsArabic ? "0" : "2"}
                textAnchor={customerNameAnchor}
                direction={customerNameDirection}
              >
                {labels.member}
              </text>
              <text
                x={customerNameX}
                y="368"
                fill="#FFFFFF"
                fontSize={props.customerName.length > 25 ? "27" : "31"}
                fontWeight="900"
                textAnchor={customerNameAnchor}
                direction={customerNameDirection}
                filter={`url(#custom-shadow-${side})`}
              >
                {boundedText(props.customerName, 30)}
              </text>
            </g>

            <g
              data-safe-zone="custom-balance"
              data-value-layout={stackCurrentValue ? "stacked" : "inline"}
            >
              <rect
                x="430"
                y="238"
                width="378"
                height="250"
                rx="22"
                fill="#020617"
                opacity="0.72"
                stroke={accent}
                strokeWidth="1.5"
              />
              <text
                x="452"
                y="276"
                fill={accent}
                fontSize="14"
                fontWeight="800"
                letterSpacing="2"
              >
                {labels.balance}
              </text>
              {stackCurrentValue ? (
                <>
                  <text
                    x="452"
                    y="320"
                    fill="#FFFFFF"
                    fontSize={standardCardValueFontSize(
                      metrics.currentAmountText,
                      42,
                    )}
                    fontWeight="900"
                  >
                    {metrics.currentAmountText}
                  </text>
                  <text
                    x="452"
                    y="349"
                    fill="#FFFFFF"
                    fontSize={standardCardDetailFontSize(
                      metrics.currentUnitText,
                      20,
                      13,
                    )}
                    fontWeight="850"
                  >
                    {metrics.currentUnitText}
                  </text>
                </>
              ) : (
                <text
                  x="452"
                  y="337"
                  fill="#FFFFFF"
                  fontSize={standardCardValueFontSize(metrics.currentText)}
                  fontWeight="900"
                >
                  {metrics.currentText}
                </text>
              )}
              <g data-safe-zone="custom-progress">
                <rect
                  x="452"
                  y={stackCurrentValue ? 371 : 361}
                  width="334"
                  height="14"
                  rx="7"
                  fill="#FFFFFF"
                  opacity="0.18"
                  stroke={accent}
                />
                <rect
                  x="452"
                  y={stackCurrentValue ? 371 : 361}
                  width={progressWidth}
                  height="14"
                  rx="7"
                  fill={`url(#custom-progress-${side})`}
                />
              </g>
              <text
                x="452"
                y="410"
                fill="#FFFFFF"
                fontSize={standardCardDetailFontSize(metrics.ratioText, 15, 11)}
                fontWeight="750"
              >
                {metrics.ratioText}
              </text>
              <text
                x="452"
                y="445"
                fill={metrics.rewardReady ? "#4ADE80" : "#E2E8F0"}
                fontSize={standardCardDetailFontSize(
                  metrics.remainingText,
                  13,
                  10,
                )}
                fontWeight="800"
              >
                {metrics.remainingText}
              </text>
            </g>
          </>
        ) : (
          <>
            <rect
              x="24"
              y="132"
              width="560"
              height="340"
              rx="22"
              fill="#020617"
              opacity="0.66"
            />
            <g data-safe-zone="custom-reward">
              <text
                x="42"
                y="158"
                fill={accent}
                fontSize="14"
                fontWeight="800"
                letterSpacing="2"
              >
                {labels.nextReward}
              </text>
              <text
                x="42"
                y="199"
                fill="#FFFFFF"
                fontSize="30"
                fontWeight="900"
                filter={`url(#custom-shadow-${side})`}
              >
                {rewardLines.map((line, index) => (
                  <tspan key={`${line}-${index}`} x="42" dy={index ? 35 : 0}>
                    {line}
                  </tspan>
                ))}
              </text>
            </g>

            <g data-safe-zone="custom-score">
              <text
                x="42"
                y="319"
                fill={accent}
                fontSize="13"
                fontWeight="800"
                letterSpacing="2"
              >
                {labels.balance}
              </text>
              <text
                x="42"
                y="357"
                fill="#FFFFFF"
                fontSize={standardCardValueFontSize(metrics.currentText, 28)}
                fontWeight="900"
              >
                {metrics.currentText}
              </text>
              <g data-safe-zone="custom-progress">
                <rect
                  x="42"
                  y="376"
                  width="514"
                  height="14"
                  rx="7"
                  fill="#FFFFFF"
                  opacity="0.18"
                  stroke={accent}
                />
                <rect
                  x="42"
                  y="376"
                  width={backProgressWidth}
                  height="14"
                  rx="7"
                  fill={`url(#custom-progress-${side})`}
                />
              </g>
              <text
                x="42"
                y="421"
                fill="#FFFFFF"
                fontSize={standardCardDetailFontSize(metrics.ratioText, 15, 11)}
                fontWeight="750"
              >
                {metrics.ratioText}
              </text>
              <text
                x="42"
                y="450"
                fill={metrics.rewardReady ? "#4ADE80" : "#E2E8F0"}
                fontSize={standardCardDetailFontSize(
                  metrics.remainingText,
                  13,
                  10,
                )}
                fontWeight="800"
              >
                {metrics.remainingText}
              </text>
            </g>
          </>
        )}

        {props.showSafeZones ? <CustomSafeZoneGuides side={side} /> : null}
      </svg>
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
