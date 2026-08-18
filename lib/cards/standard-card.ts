import { LOYALTY_CARD_ASPECT_RATIO } from "@/lib/cards/card-rendering-contract";
import { loyaltyCurrency } from "@/lib/loyalty/presentation";

export const STANDARD_CARD_ASPECT_RATIO = LOYALTY_CARD_ASPECT_RATIO;
export const CUSTOM_CARD_SAFE_ZONE_VERSION = "ID1_V1";

export const CARD_DESIGN_MODES = ["STANDARD", "CUSTOM"] as const;
export type CardDesignMode = (typeof CARD_DESIGN_MODES)[number];

export const STANDARD_CARD_ARTWORK_CATEGORIES = [
  "BARBER", "CAFE", "RESTAURANT", "FASHION", "BEAUTY", "GYM", "RETAIL", "OTHER",
] as const;

export type StandardCardArtworkCategory = (typeof STANDARD_CARD_ARTWORK_CATEGORIES)[number];

export function standardCardArtworkCategory(value: string | null | undefined): StandardCardArtworkCategory {
  const normalized = value?.trim().toUpperCase();
  return STANDARD_CARD_ARTWORK_CATEGORIES.includes(normalized as StandardCardArtworkCategory)
    ? (normalized as StandardCardArtworkCategory)
    : "OTHER";
}

export function standardCardTheme(themePreset: string | null | undefined) {
  return themePreset === "DARK" ? "dark" : "light" as const;
}

export function cardDesignMode(value: string | null | undefined): CardDesignMode {
  return value === "CUSTOM" ? "CUSTOM" : "STANDARD";
}

export type LoyaltyCardMode = "VISITS" | "POINTS" | "SALES_AMOUNT";

export const LOYALTY_CARD_PREVIEW_CUSTOMER = {
  name: "Sample Customer",
  id: "PREVIEW-001",
} as const;

function safeWholeNumber(value: number) {
  return Math.max(0, Math.trunc(Number.isFinite(value) ? value : 0));
}

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
}

function containsArabic(value: string) {
  return /[\u0600-\u06ff]/.test(value);
}

function arabicUnitLabel(value: number, unit: string) {
  const normalized = unit.trim() || "وحدة";
  if (normalized === "زيارة") {
    if (value === 1) return "زيارة واحدة";
    if (value === 2) return "زيارتان";
    if (value >= 3 && value <= 10) return "زيارات";
  }
  return normalized;
}

function formatArabicUnitValue(value: number, unit: string, locale: string) {
  const label = arabicUnitLabel(value, unit);
  return value === 1 || value === 2
    ? label
    : `${formatNumber(value, locale)} ${label}`;
}

function compactUnitForms(value: string | null | undefined) {
  const full = (value || "PTS").trim().replace(/\s+/g, " ");
  const upper = full.toUpperCase();
  if (/^RECOMMENDATIONS?$/.test(upper)) return { singular: "REC", plural: "RECS" };
  if (/^MEMBERSHIP CREDITS?$/.test(upper)) return { singular: "CREDIT", plural: "CREDITS" };

  const knownSingular = upper
    .replace(/IES$/, "Y")
    .replace(/(CH|SH|X|Z)ES$/, "$1")
    .replace(/S$/, "");
  if (knownSingular.length <= 8) {
    const plural = knownSingular.endsWith("S")
      ? knownSingular
      : knownSingular.endsWith("Y")
        ? `${knownSingular.slice(0, -1)}IES`
        : `${knownSingular}S`;
    return { singular: knownSingular, plural: plural.slice(0, 10) };
  }

  const words = upper.split(" ");
  if (words.length > 1) {
    const lastWord = words.at(-1) ?? upper;
    const compact = lastWord.replace(/S$/, "").slice(0, 8);
    return { singular: compact, plural: `${compact}S`.slice(0, 9) };
  }
  const compact = upper.replace(/S$/, "").slice(0, 7);
  return { singular: compact, plural: `${compact}S`.slice(0, 8) };
}

export function compactLoyaltyUnit(value: string | null | undefined, quantity?: number) {
  const forms = compactUnitForms(value);
  if (quantity === undefined) {
    const upper = (value || "PTS").trim().toUpperCase();
    if (/^RECOMMENDATIONS?$/.test(upper) || /^MEMBERSHIP CREDITS?$/.test(upper)) {
      return forms.plural;
    }
    return /S$/.test(upper) ? forms.plural : forms.singular;
  }
  return quantity === 1 ? forms.singular : forms.plural;
}

export function getLoyaltyCardMetrics(input: {
  balance: number;
  loyaltyMode: LoyaltyCardMode;
  rewardThreshold: number;
  unitName?: string | null;
  currency?: string | null;
  language?: "AR" | "EN";
}) {
  const language = input.language ?? "EN";
  const locale = language === "AR" ? "ar-EG" : "en-US";
  const current = safeWholeNumber(input.balance);
  const target = Math.max(1, safeWholeNumber(input.rewardThreshold));
  const remaining = Math.max(0, target - current);
  const rewardReady = current >= target;
  const currency = loyaltyCurrency(input.currency).slice(0, 5);
  const fullUnit =
    input.loyaltyMode === "VISITS"
      ? (input.unitName || (language === "AR" ? "زيارة" : "VISIT")).trim()
      : input.loyaltyMode === "POINTS"
        ? language === "AR" ? "نقطة" : (input.unitName || "PTS").trim()
        : currency;
  const unitFor = (value: number) =>
    language === "EN" && input.loyaltyMode === "POINTS"
      ? compactLoyaltyUnit(fullUnit, value)
      : language === "EN" && input.loyaltyMode === "VISITS"
        ? value === 1 ? "VISIT" : "VISITS"
        : fullUnit;
  const formatValue = (value: number) =>
    input.loyaltyMode === "SALES_AMOUNT"
      ? `${currency} ${formatNumber(value, locale)}`
      : language === "AR" && containsArabic(fullUnit)
        ? formatArabicUnitValue(value, fullUnit, locale)
      : `${formatNumber(value, locale)} ${unitFor(value)}`;
  const formatSemanticValue = (value: number) =>
    input.loyaltyMode === "SALES_AMOUNT"
      ? `${currency} ${formatNumber(value, locale)}`
      : `${formatNumber(value, locale)} ${fullUnit}`;

  return {
    current,
    target,
    remaining,
    unit: unitFor(current),
    fullUnit,
    currentText: formatValue(current),
    targetText: formatValue(target),
    ratioText: input.loyaltyMode === "SALES_AMOUNT"
      ? `${formatValue(current)} / ${formatValue(target)}`
      : language === "AR" && containsArabic(fullUnit)
        ? `${formatNumber(current, locale)} / ${formatNumber(target, locale)} ${arabicUnitLabel(target, fullUnit)}`
      : `${formatNumber(current, locale)} / ${formatNumber(target, locale)} ${unitFor(target)}`,
    remainingText: rewardReady
      ? language === "AR" ? "المكافأة جاهزة" : "REWARD READY"
      : language === "AR"
        ? `${formatValue(remaining)} حتى المكافأة`
        : `${formatValue(remaining)} TO NEXT REWARD`,
    semanticCurrentText: formatSemanticValue(current),
    semanticRatioText: `${formatSemanticValue(current)} / ${formatSemanticValue(target)}`,
    semanticRemainingText: rewardReady
      ? language === "AR" ? "المكافأة جاهزة" : "REWARD READY"
      : language === "AR"
        ? `${formatSemanticValue(remaining)} متبقي للمكافأة`
        : `${formatSemanticValue(remaining)} TO NEXT REWARD`,
    rewardReady,
    progress: Math.min(100, (current / target) * 100),
  };
}

export function getPreviewBalance(_mode: LoyaltyCardMode, threshold: number) {
  const target = Math.max(1, safeWholeNumber(threshold));
  if (target === 1) return 0;
  return Math.max(1, Math.min(target - 1, Math.round(target * 0.5)));
}

export function getLoyaltyCardPreviewData(mode: LoyaltyCardMode, threshold: number) {
  return {
    customerName: LOYALTY_CARD_PREVIEW_CUSTOMER.name,
    customerId: LOYALTY_CARD_PREVIEW_CUSTOMER.id,
    balance: getPreviewBalance(mode, threshold),
  };
}