import {
  STANDARD_CARD_ASPECT_RATIO,
  getLoyaltyCardMetrics,
  standardCardArtworkCategory,
  standardCardTheme,
  type LoyaltyCardMode,
  type StandardCardArtworkCategory,
} from "@/lib/cards/standard-card";
import {
  LOYALTY_CARD_CANVAS,
  STANDARD_CARD_QR_CONTENT_ZONE,
  STANDARD_CARD_QR_ZONE,
} from "@/lib/cards/card-rendering-contract";
import {
  standardCardDetailFontSize,
  standardCardValueFontSize,
} from "@/lib/cards/standard-card-text";
import { BUSINESS_LOGO_SVG_ASPECT_RATIO } from "@/lib/branding/logo-presentation";
import { formatWebsiteForCard } from "@/lib/urls/business-url";

export type StandardLoyaltyCardProps = {
  side?: "front" | "back";
  businessName: string;
  logoUrl?: string | null;
  primaryColor: string;
  secondaryColor?: string | null;
  themePreset?: string | null;
  customerName: string;
  customerId: string;
  balance: number;
  loyaltyMode: LoyaltyCardMode;
  unitName: string;
  currency?: string | null;
  rewardName: string;
  rewardThreshold: number;
  qrCode?: string | null;
  artworkEnabled?: boolean;
  artworkCategory?: string | null;
  businessPhone?: string | null;
  businessWebsite?: string | null;
  businessLocation?: string | null;
  businessAddress?: string | null;
  businessSocial?: string | null;
  language?: "AR" | "EN";
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
  return `standard-card-${hash.toString(36)}`;
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

function CardDefinitions({
  id,
  accent,
  secondary,
  dark,
}: {
  id: string;
  accent: string;
  secondary: string;
  dark: boolean;
}) {
  return (
    <defs>
      <linearGradient id={`${id}-base`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={dark ? "#08111F" : "#FFFFFF"} />
        <stop offset="0.62" stopColor={dark ? "#07101C" : "#F8FAFC"} />
        <stop offset="1" stopColor={dark ? "#06162E" : "#EEF4FF"} />
      </linearGradient>
      <linearGradient id={`${id}-progress`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor={accent} />
        <stop offset="1" stopColor={secondary} />
      </linearGradient>
      <clipPath id={`${id}-card-clip`}>
        <rect
          width={LOYALTY_CARD_CANVAS.width}
          height={LOYALTY_CARD_CANVAS.height}
          rx="28"
        />
      </clipPath>
      <clipPath id={`${id}-logo-clip`}>
        <rect x="42" y="35" width="64" height="64" rx="10" />
      </clipPath>
      <clipPath id={`${id}-qr-clip`}>
        <rect
          x={STANDARD_CARD_QR_ZONE.x}
          y={STANDARD_CARD_QR_ZONE.y}
          width={STANDARD_CARD_QR_ZONE.width}
          height={STANDARD_CARD_QR_ZONE.height}
          rx="12"
        />
      </clipPath>
    </defs>
  );
}

function CardBackground({
  id,
  accent,
  secondary,
  dark,
}: {
  id: string;
  accent: string;
  secondary: string;
  dark: boolean;
}) {
  return (
    <g data-safe-zone="card-background" clipPath={`url(#${id}-card-clip)`}>
      <rect
        width={LOYALTY_CARD_CANVAS.width}
        height={LOYALTY_CARD_CANVAS.height}
        rx="28"
        fill={`url(#${id}-base)`}
      />
      <circle
        cx="760"
        cy="58"
        r="220"
        fill={accent}
        opacity={dark ? "0.06" : "0.08"}
      />
      <circle
        cx="110"
        cy="510"
        r="210"
        fill={secondary}
        opacity={dark ? "0.07" : "0.1"}
      />
      <g
        fill="none"
        stroke={dark ? "#93C5FD" : "#1D4ED8"}
        strokeWidth="1"
        opacity="0.035"
      >
        <path d="M-40 110L240-80M-20 160L300-60M0 215L360-35M40 260L420-5M90 300L480 30" />
        <path d="M520 560L900 300M590 560L900 350M660 560L900 400" />
      </g>
      <rect
        x="1"
        y="1"
        width="854"
        height="538"
        rx="27"
        fill="none"
        stroke={dark ? "#334155" : "#CBD5E1"}
      />
    </g>
  );
}

function Brand({
  id,
  businessName,
  logoUrl,
  accent,
  muted,
  rtl,
}: {
  id: string;
  businessName: string;
  logoUrl?: string | null;
  accent: string;
  muted: string;
  rtl: boolean;
}) {
  return (
    <g
      data-safe-zone="brand-logo"
      direction="ltr"
      style={{ unicodeBidi: "isolate" }}
    >
      <rect
        x="42"
        y="35"
        width="64"
        height="64"
        rx="10"
        fill="#FFFFFF08"
        stroke="#64748B"
      />
      {logoUrl ? (
        <image
          href={logoUrl}
          x="42"
          y="35"
          width="64"
          height="64"
          preserveAspectRatio={BUSINESS_LOGO_SVG_ASPECT_RATIO}
          clipPath={`url(#${id}-logo-clip)`}
        />
      ) : (
        <text
          x="74"
          y="80"
          fill={accent}
          fontSize="35"
          fontWeight="800"
          textAnchor="middle"
        >
          {businessName.trim().slice(0, 1).toUpperCase()}
        </text>
      )}
      <text
        x="125"
        y="66"
        fill="currentColor"
        fontSize="25"
        fontWeight="800"
        letterSpacing="2"
      >
        {boundedText(businessName, 25)}
      </text>
      <text
        x="125"
        y="91"
        fill={muted}
        fontSize="11"
        fontWeight="600"
        letterSpacing={rtl ? "0" : "4"}
        direction={rtl ? "rtl" : "ltr"}
      >
        {rtl ? "برنامج الولاء" : "LOYALTY PROGRAMME"}
      </text>
    </g>
  );
}

function BackBrand({
  id,
  businessName,
  logoUrl,
  accent,
  muted,
  rtl,
}: {
  id: string;
  businessName: string;
  logoUrl?: string | null;
  accent: string;
  muted: string;
  rtl: boolean;
}) {
  const logoX = 42;
  const textX = rtl ? 355 : 125;
  const nameSize =
    businessName.length > 30 ? 19 : businessName.length > 20 ? 22 : 25;
  return (
    <g data-safe-zone="brand-logo" direction={rtl ? "rtl" : "ltr"}>
      <rect
        x={logoX}
        y="35"
        width="64"
        height="64"
        rx="10"
        fill="#FFFFFF08"
        stroke="#64748B"
      />
      {logoUrl ? (
        <image
          href={logoUrl}
          x={logoX}
          y="35"
          width="64"
          height="64"
          preserveAspectRatio={BUSINESS_LOGO_SVG_ASPECT_RATIO}
          clipPath={`url(#${id}-logo-clip)`}
        />
      ) : (
        <text
          x={logoX + 32}
          y="80"
          fill={accent}
          fontSize="35"
          fontWeight="800"
          textAnchor="middle"
        >
          {businessName.trim().slice(0, 1).toUpperCase()}
        </text>
      )}
      <text
        x={textX}
        y="66"
        fill="currentColor"
        fontSize={nameSize}
        fontWeight="800"
        letterSpacing="1.5"
        textAnchor={rtl ? "end" : "start"}
      >
        {boundedText(businessName, 38)}
      </text>
      <text
        x={textX}
        y="91"
        fill={muted}
        fontSize="11"
        fontWeight="600"
        letterSpacing="3"
        textAnchor={rtl ? "end" : "start"}
      >
        {rtl ? "برنامج الولاء" : "LOYALTY PROGRAMME"}
      </text>
    </g>
  );
}

export function StandardLoyaltyCard(props: StandardLoyaltyCardProps) {
  const side = props.side ?? "front";
  const language = props.language ?? "EN";
  const dir = language === "AR" ? "rtl" : "ltr";
  const rtl = language === "AR";
  const customerNameIsArabic = /[\u0600-\u06FF]/.test(props.customerName);
  const customerNameX = customerNameIsArabic ? 355 : 42;
  const customerNameAnchor = customerNameIsArabic ? "end" : "start";
  const customerNameDirection = customerNameIsArabic ? "rtl" : "ltr";
  const dark = standardCardTheme(props.themePreset) === "dark";
  const accent = safeColor(props.primaryColor);
  const secondary = safeColor(props.secondaryColor || "#FFFFFF");
  const category = standardCardArtworkCategory(props.artworkCategory);
  const foreground = dark ? "#F8FAFC" : "#111827";
  const muted = dark ? "#CBD5E1" : "#536074";
  const metrics = getLoyaltyCardMetrics({ ...props, language });
  const rewardName = boundedText(
    props.rewardName ||
      (language === "AR" ? "مكافأة الولاء" : "Loyalty reward"),
    32,
  );
  const location = props.businessLocation || props.businessAddress;
  const website = formatWebsiteForCard(props.businessWebsite);
  const contactText = [props.businessPhone, website, location]
    .filter(Boolean)
    .join("   ·   ");
  const id = stableCardId(
    `${side}:${accent}:${secondary}:${dark}:${props.businessName}`,
  );
  const labels =
    language === "AR"
      ? {
          loyalty: "بطاقة الولاء",
          member: "اسم العضو",
          memberMessage: "شكرًا لولائك",
          id: "رقم العضوية",
          balance: "الرصيد الحالي",
          scan: "امسح للكسب",
          nextReward: "مكافأتك القادمة",
          terms: "تطبق شروط برنامج الولاء",
        }
      : {
          loyalty: "LOYALTY CARD",
          member: "MEMBER NAME",
          memberMessage: "THANK YOU FOR YOUR LOYALTY",
          id: "LOYALTY ID",
          balance: "CURRENT BALANCE",
          scan: "SCAN TO EARN",
          nextReward: "YOUR NEXT REWARD",
          terms: "LOYALTY PROGRAMME TERMS APPLY",
        };

  const progressWidth = Math.max(
    0,
    Math.min(334, (334 * metrics.progress) / 100),
  );
  const shared = (
    <>
      <CardDefinitions
        id={id}
        accent={accent}
        secondary={secondary}
        dark={dark}
      />
      <CardBackground
        id={id}
        accent={accent}
        secondary={secondary}
        dark={dark}
      />
    </>
  );

  const front = (
    <>
      {shared}
      <Brand
        id={id}
        businessName={props.businessName}
        logoUrl={props.logoUrl}
        accent={accent}
        muted={muted}
        rtl={rtl}
      />
      <g data-safe-zone="qr-code">
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
            clipPath={`url(#${id}-qr-clip)`}
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
      <g data-safe-zone="loyalty-title">
        <text
          x={rtl ? 355 : 42}
          y="215"
          fill={accent}
          fontSize="46"
          fontWeight="900"
          letterSpacing={rtl ? "0" : "4"}
          textAnchor={rtl ? "end" : "start"}
          direction={dir}
          style={{ unicodeBidi: "plaintext" }}
        >
          {labels.loyalty}
        </text>
        <text
          x={rtl ? 355 : 43}
          y="247"
          fill={muted}
          fontSize="13"
          fontWeight="600"
          letterSpacing={rtl ? "0" : "4"}
          textAnchor={rtl ? "end" : "start"}
          direction={dir}
          style={{ unicodeBidi: "plaintext" }}
        >
          {labels.memberMessage}
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
      <g data-safe-zone="customer-information">
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
          y="430"
          fill={muted}
          fontSize="8"
          fontWeight="600"
          letterSpacing={rtl ? "0" : "2"}
          textAnchor={rtl ? "end" : "start"}
          direction={dir}
          style={{ unicodeBidi: "plaintext" }}
        >
          {labels.id}
        </text>
        <text
          data-emphasis="low"
          x={rtl ? 355 : 42}
          y="450"
          fill={muted}
          fontSize="10"
          fontWeight="500"
          letterSpacing="1.5"
          opacity="0.72"
          textAnchor={rtl ? "end" : "start"}
          direction="ltr"
        >
          {boundedText(props.customerId, 24)}
        </text>
      </g>
      <g data-safe-zone="loyalty-balance">
        <rect
          x="430"
          y="238"
          width="378"
          height="250"
          rx="22"
          fill={dark ? "#02081788" : "#FFFFFFCC"}
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
        <g data-safe-zone="progress">
          <rect
            x="452"
            y="361"
            width="334"
            height="14"
            rx="7"
            fill={dark ? "#FFFFFF18" : "#0F172A18"}
            stroke={accent}
            opacity="0.9"
          />
          <rect
            x="452"
            y="361"
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

  const backTextX = rtl ? 814 : 42;
  const backTextAnchor = rtl ? "end" : "start";
  const backProgressX = rtl ? 300 : 42;
  const backProgressWidth = Math.min(514, (514 * metrics.progress) / 100);
  const backProgressFillX = rtl
    ? backProgressX + 514 - backProgressWidth
    : backProgressX;
  const rewardLines = wrappedText(
    props.rewardName || rewardName,
    rtl ? 29 : 34,
    3,
  );
  const back = (
    <>
      {shared}
      <BackBrand
        id={id}
        businessName={props.businessName}
        logoUrl={props.logoUrl}
        accent={accent}
        muted={muted}
        rtl={rtl}
      />
      <line x1="42" y1="121" x2="814" y2="121" stroke={accent} opacity="0.25" />
      <g
        data-safe-zone="reward"
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
            <tspan key={line} x={backTextX} dy={index ? 35 : 0}>
              {line}
            </tspan>
          ))}
        </text>
      </g>
      <g
        data-safe-zone="loyalty-balance"
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
            fill={dark ? "#FFFFFF18" : "#0F172A18"}
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
      <line x1="42" y1="469" x2="814" y2="469" stroke={accent} opacity="0.25" />
      <g data-safe-zone="contact-information">
        {contactText ? (
          <text
            x="428"
            y="497"
            direction={dir}
            style={{ unicodeBidi: "plaintext" }}
            fill={muted}
            fontSize="13"
            fontWeight="650"
            textAnchor="middle"
            aria-label="Business contact information"
          >
            {boundedText(contactText, 78)}
          </text>
        ) : null}
        <text
          x="428"
          y={contactText ? "524" : "507"}
          fill={muted}
          fontSize="10"
          fontWeight="600"
          letterSpacing={rtl ? "0" : "3"}
          textAnchor="middle"
        >
          {labels.terms} · LOYALFLOW
        </text>
      </g>
    </>
  );

  return (
    <article
      data-testid={`standard-card-${side}`}
      data-card-aspect-ratio={STANDARD_CARD_ASPECT_RATIO.toFixed(3)}
      className="relative w-full overflow-hidden rounded-[5.2%] shadow-[0_24px_55px_-28px_rgba(15,23,42,0.8)]"
      style={{
        aspectRatio: String(STANDARD_CARD_ASPECT_RATIO),
        color: foreground,
      }}
    >
      <svg
        viewBox={`0 0 ${LOYALTY_CARD_CANVAS.width} ${LOYALTY_CARD_CANVAS.height}`}
        width="100%"
        height="100%"
        direction="ltr"
        style={{ unicodeBidi: "isolate" }}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`${props.businessName} loyalty card ${side}`}
      >
        {side === "front" ? front : back}
      </svg>
    </article>
  );
}
