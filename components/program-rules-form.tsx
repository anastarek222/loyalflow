"use client";

import { useFormStatus } from "react-dom";

import type { ProgramRulesBusiness } from "@/components/business-settings-form";

type Props = {
  language: "AR" | "EN";
  business: ProgramRulesBusiness;
  status: "saved" | "invalid" | undefined;
  action: (formData: FormData) => void | Promise<void>;
};

const inputClass =
  "w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4 text-foreground outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/20";

function SaveButton({ language }: { language: "AR" | "EN" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-6 rounded-[var(--lf-radius-input)] bg-foreground px-6 py-4 font-semibold text-white transition hover:bg-primary disabled:cursor-wait disabled:opacity-60"
    >
      {pending
        ? language === "AR"
          ? "جارٍ الحفظ…"
          : "Saving…"
        : language === "AR"
          ? "حفظ قواعد البرنامج"
          : "Save programme rules"}
    </button>
  );
}

export function ProgramRulesForm({
  language,
  business,
  status,
  action,
}: Props) {
  const t = (ar: string, en: string) => (language === "AR" ? ar : en);
  const fields = [
    ["loyaltyProgramName", t("اسم برنامج الولاء", "Programme name"), business.loyaltyProgramName ?? "", 80],
    ["pointsName", t("اسم النقاط", "Points name"), business.pointsName ?? "", 30],
    ["unitName", t("اسم الوحدة", "Unit name"), business.unitName, 30],
    ["earnAmount", t("قيمة الإضافة", "Earn amount"), business.earnAmount, undefined],
    ["rewardName", t("اسم المكافأة", "Reward name"), business.rewardName, 100],
    ["rewardThreshold", t("الرصيد المطلوب للمكافأة", "Reward threshold"), business.rewardThreshold, undefined],
    ["rewardCode", t("كود المكافأة", "Reward code"), business.rewardCode ?? "", 80],
  ] as const;

  return (
    <form
      action={action}
      className="rounded-[var(--lf-radius-card)] border border-border bg-white p-6 shadow-sm sm:p-8"
    >
      {status ? (
        <p
          role="status"
          aria-live="polite"
          className={`mb-5 rounded-[var(--lf-radius-input)] border px-4 py-3 text-sm font-semibold ${
            status === "saved"
              ? "border-success/30 bg-success-subtle text-success"
              : "border-danger/30 bg-danger-subtle text-danger"
          }`}
        >
          {status === "saved"
            ? t("تم حفظ قواعد البرنامج.", "Programme rules saved.")
            : t("راجع قواعد البرنامج.", "Review the programme rules.")}
        </p>
      ) : null}
      <h2 className="text-xl font-bold text-foreground">
        {t("قواعد برنامج الولاء", "Loyalty programme rules")}
      </h2>
      <p className="mt-1 text-sm text-foreground-subtle">
        {t(
          "إعدادات الكسب والهدف والمكافأة الافتراضية.",
          "Earning, target and default reward compatibility settings.",
        )}
      </p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {fields.map(([name, label, value, maxLength]) => (
          <label key={name} className="text-sm font-medium text-foreground-muted">
            <span className="mb-2 block">{label}</span>
            <input
              name={name}
              type={name === "earnAmount" || name === "rewardThreshold" ? "number" : "text"}
              min={name === "earnAmount" || name === "rewardThreshold" ? 1 : undefined}
              defaultValue={value}
              required={["unitName", "earnAmount", "rewardName", "rewardThreshold"].includes(name)}
              maxLength={maxLength}
              className={inputClass}
            />
          </label>
        ))}
        <label className="text-sm font-medium text-foreground-muted">
          <span className="mb-2 block">{t("لغة الكارت الافتراضية", "Default card language")}</span>
          <select name="cardDefaultLanguage" defaultValue={business.cardDefaultLanguage} className={inputClass}>
            <option value="AR">العربية (RTL)</option>
            <option value="EN">English (LTR)</option>
          </select>
        </label>
        <label className="text-sm font-medium text-foreground-muted">
          <span className="mb-2 block">{t("نظام الولاء", "Loyalty mode")}</span>
          <select name="loyaltyMode" defaultValue={business.loyaltyMode} className={inputClass}>
            <option value="VISITS">{t("زيارات / أختام", "Visits")}</option>
            <option value="POINTS">{t("نقاط", "Points")}</option>
            <option value="SALES_AMOUNT">{t("إجمالي المبيعات", "Sales amount")}</option>
          </select>
        </label>
        <label className="text-sm font-medium text-foreground-muted">
          <span className="mb-2 block">{t("نوع المكافأة", "Reward type")}</span>
          <select name="rewardType" defaultValue={business.rewardType} className={inputClass}>
            <option value="GIFT">{t("هدية", "Gift")}</option>
            <option value="PROMO_CODE">{t("رمز ترويجي", "Promo Code")}</option>
            <option value="DISCOUNT">{t("خصم", "Discount")}</option>
            <option value="CUSTOM">{t("مكافأة مخصصة", "Custom")}</option>
          </select>
        </label>
        <label className="text-sm font-medium text-foreground-muted sm:col-span-2">
          <span className="mb-2 block">{t("رسالة الترحيب داخل الكارت", "In-card welcome message")}</span>
          <textarea name="welcomeMessage" defaultValue={business.welcomeMessage ?? ""} maxLength={300} rows={3} className={inputClass} />
        </label>
        <label className="text-sm font-medium text-foreground-muted sm:col-span-2">
          <span className="mb-2 block">{t("وصف المكافأة", "Reward description")}</span>
          <textarea name="rewardDescription" defaultValue={business.rewardDescription ?? ""} maxLength={300} rows={3} className={inputClass} />
        </label>
      </div>
      <SaveButton language={language} />
    </form>
  );
}
