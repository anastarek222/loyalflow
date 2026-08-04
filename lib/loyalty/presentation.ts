import type { LoyaltyMode } from "@/generated/prisma/client";
import type { AppLanguage } from "@/lib/i18n";

type LoyaltyPresentationInput = {
  loyaltyMode: LoyaltyMode;
  language: AppLanguage;
  unitName: string | null | undefined;
  currency?: string | null;
  earnAmount?: number;
};

function localeFor(language: AppLanguage) {
  return language === "AR" ? "ar-EG" : "en-US";
}

export function loyaltyCurrency(currency: string | null | undefined) {
  const normalized = currency?.trim().toUpperCase();
  return normalized || "EGP";
}

export function operationalUnitLabel(input: LoyaltyPresentationInput) {
  if (input.loyaltyMode === "SALES_AMOUNT") return loyaltyCurrency(input.currency);
  const configured = input.unitName?.trim();
  if (configured) return configured;
  if (input.loyaltyMode === "VISITS") return input.language === "AR" ? "زيارة" : "visits";
  return input.language === "AR" ? "نقطة" : "points";
}

export function formatLoyaltyAmount(input: LoyaltyPresentationInput & { amount: number }) {
  const formatted = formatLoyaltyNumber(input.amount, input.language);
  const unit = operationalUnitLabel(input);
  return input.loyaltyMode === "SALES_AMOUNT" ? `${unit} ${formatted}` : `${formatted} ${unit}`;
}

export function formatLoyaltyNumber(amount: number, language: AppLanguage) {
  return new Intl.NumberFormat(localeFor(language), { maximumFractionDigits: 0 }).format(Math.trunc(amount));
}

export function balanceLabel(input: LoyaltyPresentationInput) {
  if (input.loyaltyMode === "SALES_AMOUNT") return input.language === "AR" ? "رصيد المبيعات المسجل" : "Recorded sales balance";
  if (input.loyaltyMode === "VISITS") return input.language === "AR" ? "رصيد الزيارات" : "Visit balance";
  return input.language === "AR" ? "رصيد النقاط" : "Points balance";
}

export function earnActionLabel(input: LoyaltyPresentationInput) {
  const amount = Math.max(1, Math.trunc(input.earnAmount ?? 1));
  if (input.loyaltyMode === "SALES_AMOUNT") return input.language === "AR" ? "تسجيل عملية بيع" : "Record sale";
  if (input.loyaltyMode === "POINTS") return input.language === "AR"
    ? `إضافة ${formatLoyaltyAmount({ ...input, amount })}`
    : `Add ${formatLoyaltyAmount({ ...input, amount })}`;
  if (amount === 1) return input.language === "AR" ? "تسجيل زيارة" : "Record visit";
  return input.language === "AR"
    ? `تسجيل زيارة — قيمة الإضافة: ${formatLoyaltyAmount({ ...input, amount })}`
    : `Record visit — adds ${formatLoyaltyAmount({ ...input, amount })}`;
}

export function fallbackRewardHelp(language: AppLanguage) {
  return language === "AR"
    ? "هدف المكافأة الافتراضي عند عدم اختيار مكافأة من الكتالوج. كل مكافأة في الكتالوج لها تكلفة مستقلة."
    : "Default reward target when no catalogue reward is selected. Each catalogue reward has its own cost.";
}
