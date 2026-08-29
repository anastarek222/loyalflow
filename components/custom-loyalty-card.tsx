/* eslint-disable @next/next/no-img-element */
import {
  LOYALTY_CARD_CANVAS,
  STANDARD_CARD_QR_CONTENT_ZONE,
  STANDARD_CARD_QR_ZONE,
} from "@/lib/cards/card-rendering-contract";
import {
  CUSTOM_CARD_SAFE_ZONE_VERSION,
  STANDARD_CARD_ASPECT_RATIO,
  getLoyaltyCardMetrics,
  standardCardArtworkCategory,
  type StandardCardArtworkCategory,
} from "@/lib/cards/standard-card";
import {
  shouldStackStandardCardValue,
  standardCardDetailFontSize,
  standardCardValueFontSize,
} from "@/lib/cards/standard-card-text";
import type { StandardLoyaltyCardProps } from "@/components/standard-loyalty-card";

export type CustomLoyaltyCardProps = StandardLoyaltyCardProps & {
  customFrontArtworkUrl?: string | null;
  customBackArtworkUrl?: string | null;
  customSafeZoneVersion?: string | null;
  showSafeZones?: boolean;
};

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
    const candidate = lines.length ? `${lines.at(-1)} ${word}` : word;
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

function stableCardId(value: string) {
  let hash = 0;
  for (const character of value)
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return `custom-card-${hash.toString(36)}`;
}

function PreviewQr({ x, y, size }: { x: number; y: number; size: number }) {
  return (
    <svg
      x={x}
      y={y}
      width={size}
      height={size}
      viewBox="0 0 29 29"
      role="img"
      aria-label="Deterministic loyalty card preview QR"
      shapeRendering="crispEdges"
    >
      <rect width="29" height="29" fill="#fff" />
      <path
        fill="#020617"
        d="M1 1h7v7H1zM3 3v3h3V3zM21 1h7v7h-7zM23 3v3h3V3zM1 21h7v7H1zM3 23v3h3v-3zM10 1h2v2h-2zM14 1h2v3h-2zM17 2h2v2h-2zM10 5h3v2h-3zM15 5h2v3h-2zM18 6h2v2h-2zM10 10h2v2h-2zM14 10h3v2h-3zM18 10h2v3h-2zM22 10h2v2h-2zM25 10h3v3h-3zM10 14h3v3h-3zM15 14h2v2h-2zM19 15h3v2h-3zM24 14h2v3h-2zM10 19h2v3h-2zM14 18h3v2h-3zM18 19h2v3h-2zM22 19h2v2h-2zM25 20h3v3h-3zM10 24h3v3h-3zM15 23h2v2h-2zM18 24h3v3h-3zM23 24h2v3h-2z"
      />
    </svg>
  );
}

function Artwork({
  category,
  x,
  y,
  size,
}: {
  category: StandardCardArtworkCategory;
  x: number;
  y: number;
  size: number;
}) {
  const paths: Record<StandardCardArtworkCategory, string> = {
    BARBER: "M11 7l12 12M23 7L11 19M10 20l-4 4M20 20l4 4M8 5l18 18",
    CAFE: "M7 11h14v10H7zM21 13h4v5h-4M10 7c0 2 2 2 2 4M16 7c0 2 2 2 2 4",
    RESTAURANT: "M9 6v17M6 6v7a3 3 0 006 0V6M20 6v17M20 6c5 3 5 9 0 11",
    FASHION: "M10 8l5-3 5 3 5 7-5 3v8H10v-8l-5-3z",
    BEAUTY: "M15 5c3 5 9 8 9 13a9 9 0 11-18 0c0-5 6-8 9-13zM11 19c2 2 6 2 8 0",
    GYM: "M5 12v6M9 9v12M21 9v12M25 12v6M9 15h12",
    RETAIL: "M7 11h16l-1 13H8zM10 11a5 5 0 0110 0",
    OTHER: "M6 18c5-10 13-10 18 0M8 22c4-7 10-7 14 0M11 25c2-4 6-4 8 0",
  };
  return (
    <svg
      x={x}
      y={y}
      width={size}
      height={size}
      viewBox="0 0 30 30"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.15"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[category]} />
    </svg>
  );
}

function SafeZoneGuides({ side }: { side: "front" | "back" }) {
  const common = {
    fill: "none",
    stroke: "#38BDF8",
    strokeWidth: 3,
    strokeDasharray: "9 7",
    opacity: 0.95,
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
          {...common}
        />
        <rect x="34" y="303" width="329" height="151" rx="14" {...common} />
        <rect x="422" y="230" width="394" height="266" rx="24" {...common} />
      </g>
    );
  }

  return (
    <g data-safe-zone="custom-guides" aria-hidden="true">
      <rect x="34" y="137" width="530" height="132" rx="14" {...common} />
      <rect x="34" y="296" width="788" height="164" rx="14" {...common} />
      <rect x="680" y="146" width="148" height="148" rx="74" {...common} />
    </g>
  );
}

export function CustomLoyaltyCard(props: CustomLoyaltyCardProps) {
  const side = props.side ?? "front";
  const language = props.language ?? "EN";
  const dir = language === "AR" ? "rtl" : "ltr";
  const rtl = language === "AR";
  const customerNameIsArabic = /[\u0600-\u06FF]/.test(props.customerName);
  const customerNameX = customerNameIsArabic ? 355 : 42;
  const customerNameAnchor = customerNameIsArabic ? "end" : "start";
  const customerNameDirection = customerNameIsArabic ? "rtl" : "ltr";
  const accent = safeColor(props.secondaryColor || props.primaryColor);
  const secondary = safeColor(props.primaryColor);
  const foreground = "#F8FAFC";
  const muted = "#CBD5E1";
  const category = standardCardArtworkCategory(props.artworkCategory);
  const metrics = getLoyaltyCardMetrics({ ...props, language });
  const stackCurrentValue = shouldStackStandardCardValue(
    metrics.currentAmountText,
    metrics.currentUnitText,
  );
  const artworkUrl =
    side === "front" ? props.customFrontArtworkUrl : props.customBackArtworkUrl;
  const id = stableCardId(
    `${side}:${accent}:${secondary}:${props.customerId}:${props.businessName}`,
  );
  const labels =
    language === "AR"
      ? {
          member: "اسم العضو",
          id: "رقم العضوية",
          balance: "الرصيد الحالي",
          scan: "امسح للكسب",
          nextReward: "مكافأتك القادمة",
        }
      : {
          member: "MEMBER NAME",
          id: "LOYALTY ID",
          balance: "CURRENT BALANCE",
          scan: "SCAN TO EARN",
          nextReward: "YOUR NEXT REWARD",
        };
  const progressWidth = Math.max(
    0,
    Math.min(334, (334 * metrics.progress) / 100),
  );
  const backTextX = rtl ? 814 : 42;
  const backTextAnchor = rtl ? "end" : "start";
  const backProgressX = rtl ? 300 : 42;
  const backProgressWidth = Math.min(514, (514 * metrics.progress) / 100);
  const backProgressFillX = rtl
    ? backProgressX + 514 - backProgressWidth
    : backProgressX;
  const rewardName = boundedText(
    props.rewardName ||
      (language === "AR" ? "مكافأة الولاء" : "Loyalty reward"),
    32,
  );
  const rewardLines = wrappedText(rewardName, rtl ? 29 : 34, 3);

  const front = (
    <>
      <g data-safe-zone="qr-code" data-layout-authority="standard-card">
        <rect
          x={STANDARD_CARD_QR_ZONE.x}
          y={STANDARD_CARD_QR_ZONE.y}
          width={STANDARD_CARD_QR_ZONE.width}
          height={STANDARD_CARD_QR_ZONE.height}
          rx="12"
          fill="#fff"
          stroke="#CBD5E1"
        />
        {props.qrCode ? (
          <image
            href={props.qrCode}
            x={STANDARD_CARD_QR_CONTENT_ZONE.x}
            y={STANDARD_CARD_QR_CONTENT_ZONE.y}
            width={STANDARD_CARD_QR_CONTENT_ZONE.width}
            height={STANDARD_CARD_QR_CONTENT_ZONE.height}
            preserveAspectRatio="xMidYMid meet"
          />
        ) : (
          <PreviewQr
            x={STANDARD_CARD_QR_CONTENT_ZONE.x}
            y={STANDARD_CARD_QR_CONTENT_ZONE.y}
            size={STANDARD_CARD_QR_CONTENT_ZONE.width}
          />
        )}
        <text
          x={STANDARD_CARD_QR_ZONE.x + STANDARD_CARD_QR_ZONE.width / 2}
          y={STANDARD_CARD_QR_ZONE.y + STANDARD_CARD_QR_ZONE.height + 19}
          fill={muted}
          fontSize="11"
          fontWeight="700"
          letterSpacing="2"
          textAnchor="middle"
        >
          {labels.scan}
        </text>
      </g>

      <line
        x1="404"
        y1="180"
        x2="404"
        y2="488"
        stroke={accent}
        opacity="0.38"
      />

      <g
        data-safe-zone="customer-information"
        data-layout-authority="standard-card"
      >
        <text
          x={rtl ? 355 : 42}
          y="327"
          fill={accent}
          fontSize="13"
          fontWeight="700"
          letterSpacing={rtl ? "0" : "2"}
          textAnchor={rtl ? "end" : "start"}
          direction={dir}
          style={{ unicodeBidi: "plaintext" }}
        >
          {labels.member}
        </text>
        <text
          x={customerNameX}
          y="368"
          fill={foreground}
          fontSize={props.customerName.length > 25 ? "27" : "31"}
          fontWeight="800"
          textAnchor={customerNameAnchor}
          direction={customerNameDirection}
          style={{ unicodeBidi: "plaintext" }}
        >
          {boundedText(props.customerName, 30)}
        </text>
        <line
          x1="42"
          y1="390"
          x2="355"
          y2="390"
          stroke={accent}
          opacity="0.8"
        />
        <text
          data-emphasis="low"
          x={rtl ? 355 : 42}
          y="426"
          fill={muted}
          fontSize="7"
          fontWeight="700"
          letterSpacing={rtl ? "0" : "1.6"}
          opacity="0.58"
          textAnchor={rtl ? "end" : "start"}
          direction={dir}
          style={{ unicodeBidi: "plaintext" }}
        >
          {labels.id}
        </text>
        <text
          data-emphasis="low"
          x={rtl ? 355 : 42}
          y="445"
          fill={muted}
          fontSize="9"
          fontWeight="600"
          letterSpacing="1.2"
          opacity="0.66"
          textAnchor={rtl ? "end" : "start"}
          direction="ltr"
        >
          {boundedText(props.customerId, 24)}
        </text>
      </g>

      <g
        data-safe-zone="loyalty-balance"
        data-layout-authority="standard-card"
        data-value-layout={stackCurrentValue ? "stacked" : "inline"}
      >
        <rect
          x="430"
          y="238"
          width="378"
          height="250"
          rx="22"
          fill="#02081788"
          stroke={accent}
          opacity="0.98"
        />
        <text
          x="452"
          y="276"
          fill={accent}
          fontSize="14"
          fontWeight="800"
          letterSpacing={rtl ? "0" : "2"}
          direction={dir}
          style={{ unicodeBidi: "plaintext" }}
        >
          {labels.balance}
        </text>
        {stackCurrentValue ? (
          <>
            <text
              x="452"
              y="320"
              fill={foreground}
              fontSize={standardCardValueFontSize(
                metrics.currentAmountText,
                42,
              )}
              fontWeight="900"
              direction="ltr"
              style={{ unicodeBidi: "isolate" }}
            >
              {metrics.currentAmountText}
            </text>
            <text
              x="452"
              y="349"
              fill={foreground}
              fontSize={standardCardDetailFontSize(
                metrics.currentUnitText,
                20,
                13,
              )}
              fontWeight="850"
              direction={dir}
              style={{ unicodeBidi: "plaintext" }}
            >
              {metrics.currentUnitText}
            </text>
          </>
        ) : (
          <text
            x="452"
            y="337"
            fill={foreground}
            fontSize={standardCardValueFontSize(metrics.currentText)}
            fontWeight="900"
            direction="ltr"
            style={{ unicodeBidi: "isolate" }}
          >
            {metrics.currentText}
          </text>
        )}
        <g data-safe-zone="progress">
          <rect
            x="452"
            y={stackCurrentValue ? 371 : 361}
            width="334"
            height="14"
            rx="7"
            fill="#FFFFFF18"
            stroke={accent}
            opacity="0.9"
          />
          <rect
            x="452"
            y={stackCurrentValue ? 371 : 361}
            width={Math.min(334, progressWidth)}
            height="14"
            rx="7"
            fill={`url(#${id}-progress)`}
          />
        </g>
        <text
          x="452"
          y="410"
          fill={foreground}
          fontSize={standardCardDetailFontSize(metrics.ratioText, 15, 11)}
          fontWeight="750"
          direction="ltr"
          style={{ unicodeBidi: "isolate" }}
        >
          {metrics.ratioText}
        </text>
        <text
          x="452"
          y="445"
          fill={metrics.rewardReady ? "#22C55E" : muted}
          fontSize={standardCardDetailFontSize(metrics.remainingText, 13, 10)}
          fontWeight="800"
          direction={dir}
          style={{ unicodeBidi: "plaintext" }}
        >
          {metrics.remainingText}
        </text>
      </g>
    </>
  );

  const back = (
    <>
      <g
        data-safe-zone="reward"
        data-layout-authority="standard-card"
        direction={dir}
        style={{ unicodeBidi: "plaintext" }}
      >
        <text
          x={backTextX}
          y="158"
          fill={accent}
          fontSize="14"
          fontWeight="800"
          letterSpacing={rtl ? "0" : "2"}
          textAnchor={backTextAnchor}
        >
          {labels.nextReward}
        </text>
        <text
          x={backTextX}
          y="199"
          fill={foreground}
          fontSize="30"
          fontWeight="900"
          textAnchor={backTextAnchor}
        >
          {rewardLines.map((line, index) => (
            <tspan key={`${line}-${index}`} x={backTextX} dy={index ? 35 : 0}>
              {line}
            </tspan>
          ))}
        </text>
      </g>

      <g
        data-safe-zone="loyalty-balance"
        data-layout-authority="standard-card"
        direction={dir}
        style={{ unicodeBidi: "plaintext" }}
      >
        <text
          x={backTextX}
          y="319"
          fill={accent}
          fontSize="13"
          fontWeight="800"
          letterSpacing={rtl ? "0" : "2"}
          textAnchor={backTextAnchor}
        >
          {labels.balance}
        </text>
        <text
          x={backTextX}
          y="357"
          fill={foreground}
          fontSize={standardCardValueFontSize(metrics.currentText, 28)}
          fontWeight="900"
          textAnchor={backTextAnchor}
        >
          {metrics.currentText}
        </text>
        <g data-safe-zone="progress">
          <rect
            x={backProgressX}
            y="376"
            width="514"
            height="14"
            rx="7"
            fill="#FFFFFF18"
            stroke={accent}
            opacity="0.9"
          />
          <rect
            x={backProgressFillX}
            y="376"
            width={backProgressWidth}
            height="14"
            rx="7"
            fill={`url(#${id}-progress)`}
          />
        </g>
        <text
          x={backTextX}
          y="421"
          fill={foreground}
          fontSize={standardCardDetailFontSize(metrics.ratioText, 15, 11)}
          fontWeight="750"
          textAnchor={backTextAnchor}
        >
          {metrics.ratioText}
        </text>
        <text
          x={backTextX}
          y="450"
          fill={metrics.rewardReady ? "#22C55E" : muted}
          fontSize={standardCardDetailFontSize(metrics.remainingText, 13, 10)}
          fontWeight="800"
          textAnchor={backTextAnchor}
        >
          {metrics.remainingText}
        </text>
      </g>

      <g
        data-safe-zone="brand-artwork"
        data-layout-authority="standard-card"
        data-visual-priority="secondary"
        color={accent}
      >
        {props.artworkEnabled === false ? null : (
          <>
            <circle
              cx={rtl ? 102 : 754}
              cy="220"
              r="67"
              fill={accent}
              opacity="0.055"
            />
            <circle
              cx={rtl ? 102 : 754}
              cy="220"
              r="67"
              fill="none"
              stroke={accent}
              opacity="0.2"
            />
            <g opacity="0.38">
              <Artwork
                category={category}
                x={rtl ? 54 : 706}
                y={172}
                size={96}
              />
            </g>
          </>
        )}
      </g>
    </>
  );

  return (
    <article
      data-testid={`custom-card-${side}`}
      data-card-aspect-ratio={STANDARD_CARD_ASPECT_RATIO.toFixed(3)}
      data-safe-zone-version={
        props.customSafeZoneVersion || CUSTOM_CARD_SAFE_ZONE_VERSION
      }
      data-layout-authority="standard-card"
      className="relative w-full overflow-hidden rounded-[5.2%] border border-white/20 bg-slate-950 text-white shadow-[0_24px_55px_-28px_rgba(15,23,42,0.9)]"
      style={{ aspectRatio: String(STANDARD_CARD_ASPECT_RATIO) }}
    >
      {artworkUrl ? (
        <img
          src={artworkUrl}
          alt=""
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 size-full bg-slate-950 object-contain"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,#334155_0,transparent_36%),linear-gradient(135deg,#18181b,#020617)]" />
      )}
      <svg
        className="absolute inset-0 size-full"
        viewBox={`0 0 ${LOYALTY_CARD_CANVAS.width} ${LOYALTY_CARD_CANVAS.height}`}
        width="100%"
        height="100%"
        direction="ltr"
        style={{ unicodeBidi: "isolate" }}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`${props.businessName} custom loyalty card ${side}`}
      >
        <defs>
          <linearGradient id={`${id}-progress`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={accent} />
            <stop offset="1" stopColor={secondary} />
          </linearGradient>
        </defs>
        {side === "front" ? front : back}
        {props.showSafeZones ? <SafeZoneGuides side={side} /> : null}
      </svg>
    </article>
  );
}
