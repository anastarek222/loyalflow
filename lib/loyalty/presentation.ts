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

export function loyaltyModeLabel(
  loyaltyMode: LoyaltyMode,
  language: AppLanguage,
) {
  if (loyaltyMode === "VISITS") return language === "AR" ? "زيارات" : "Visits";
  if (loyaltyMode === "POINTS") return language === "AR" ? "نقاط" : "Points";
  return language === "AR" ? "قيمة المبيعات" : "Sales amount";
}

export function loyaltyProgrammeSummary(
  input: LoyaltyPresentationInput & {
    earnAmount: number;
    rewardThreshold: number;
  },
) {
  return {
    mode: loyaltyModeLabel(input.loyaltyMode, input.language),
    earn:
      input.loyaltyMode === "SALES_AMOUNT"
        ? input.language === "AR"
          ? "قيمة البيع المسجلة"
          : "Recorded sale amount"
        : formatLoyaltyAmount({ ...input, amount: input.earnAmount }),
    target: formatLoyaltyAmount({ ...input, amount: input.rewardThreshold }),
  };
}

export function loyaltyProgrammeFieldHelp(
  loyaltyMode: LoyaltyMode,
  language: AppLanguage,
) {
  const salesMode = loyaltyMode === "SALES_AMOUNT";
  return {
    loyaltyProgramName:
      language === "AR"
        ? "اسم إداري للبرنامج؛ لا يغيّر طريقة احتساب الرصيد."
        : "Administrative programme name; it does not change balance calculation.",
    loyaltyMode:
      language === "AR"
        ? "يحدد مصدر الرصيد: زيارات أو نقاط ثابتة أو قيمة المبيعات المسجلة."
        : "Defines the balance source: visits, fixed points, or recorded sales value.",
    unitName:
      language === "AR"
        ? salesMode
          ? "اسم الوحدة لا يحدد قيمة المبيعات؛ وضع المبيعات يستخدم عملة النشاط."
          : "الاسم الظاهر لوحدة الرصيد على البطاقة والتقارير."
        : salesMode
          ? "Unit name does not define sales value; Sales amount uses the business currency."
          : "Display name for the balance unit on cards and reports.",
    earnAmount:
      language === "AR"
        ? salesMode
          ? "قيمة البيع المسجلة في العملية هي التي تُضاف فعليًا؛ هذه ليست قيمة بيع ثابتة."
          : "القيمة الثابتة التي تُضاف لكل عملية كسب مؤهلة."
        : salesMode
          ? "The recorded sale amount is what is actually credited; this is not a fixed sale value."
          : "Fixed amount credited for each eligible earning operation.",
    rewardThreshold:
      language === "AR"
        ? salesMode
          ? "هدف المكافأة الافتراضي محسوب بعملة النشاط."
          : "الرصيد المطلوب للوصول إلى المكافأة الافتراضية."
        : salesMode
          ? "Fallback reward target measured in the business currency."
          : "Balance required to reach the fallback reward.",
    rewardName:
      language === "AR"
        ? "اسم المكافأة الافتراضية؛ لا يغيّر تكلفة مكافآت الكتالوج المستقلة."
        : "Fallback reward name; it does not change independent catalogue reward costs.",
  };
}

export function fallbackRewardHelp(language: AppLanguage) {
  return language === "AR"
    ? "هدف المكافأة الافتراضي عند عدم اختيار مكافأة من الكتالوج. كل مكافأة في الكتالوج لها تكلفة مستقلة."
    : "Default reward target when no catalogue reward is selected. Each catalogue reward has its own cost.";
}
