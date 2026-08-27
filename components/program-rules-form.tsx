"use client";

import type { FormEvent } from "react";
import { useFormStatus } from "react-dom";

import type { ProgramRulesBusiness } from "@/components/business-settings-form";
import { UnitLabelInput } from "@/components/unit-label-input";
import { STANDARD_CARD_UNIT_LABEL_MAX_LENGTH } from "@/lib/cards/standard-card-text";
import { getLoyaltyEconomicRuleChanges } from "@/lib/loyalty/program-change-safety";
import {
  fallbackRewardHelp,
  loyaltyProgrammeFieldHelp,
} from "@/lib/loyalty/presentation";

type Props = {
  language: "AR" | "EN";
  business: ProgramRulesBusiness;
  hasProgrammeHistory: boolean;
  status:
    | "saved"
    | "invalid"
    | "mode-blocked"
    | "economic-confirmation-required"
    | "subscription-restricted"
    | undefined;
  action: (formData: FormData) => void | Promise<void>;
};

const inputClass =
  "w-full min-h-12 rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-3 text-foreground outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10";

function SaveButton({ language }: { language: "AR" | "EN" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-7 min-h-12 w-full rounded-[var(--lf-radius-input)] bg-primary px-6 py-3 font-bold text-white transition hover:bg-primary-hover disabled:cursor-wait disabled:opacity-60 sm:w-auto"
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
  hasProgrammeHistory,
  status,
  action,
}: Props) {
  const t = (ar: string, en: string) => (language === "AR" ? ar : en);
  const fieldHelp = loyaltyProgrammeFieldHelp(business.loyaltyMode, language);
  const helpByField: Record<string, string | undefined> = {
    loyaltyProgramName: fieldHelp.loyaltyProgramName,
    unitName: fieldHelp.unitName,
    earnAmount: fieldHelp.earnAmount,
    rewardName: fieldHelp.rewardName,
    rewardThreshold: fieldHelp.rewardThreshold,
  };

  function confirmEconomicRuleChanges(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const formData = new FormData(form);
    const confirmation = form.elements.namedItem(
      "confirmEconomicRules",
    ) as HTMLInputElement | null;

    const changes = getLoyaltyEconomicRuleChanges(
      {
        earnAmount: business.earnAmount,
        rewardThreshold: business.rewardThreshold,
        rewardType: business.rewardType,
      },
      {
        earnAmount: Number(formData.get("earnAmount")),
        rewardThreshold: Number(formData.get("rewardThreshold")),
        rewardType: String(formData.get("rewardType")),
      },
    );

    if (
      !hasProgrammeHistory ||
      changes.length === 0 ||
      confirmation?.value === "true"
    ) {
      return;
    }

    const labels = {
      earnAmount: t("قيمة الإضافة", "Earn amount"),
      rewardThreshold: t("هدف المكافأة", "Reward threshold"),
      rewardType: t("نوع المكافأة", "Reward type"),
    };
    const impact = changes
      .map(
        (change) =>
          `${labels[change.field]}: ${change.before} → ${change.after}`,
      )
      .join("\n");

    const approved = window.confirm(
      t(
        `معاينة التأثير:\n${impact}\n\nسيتم تطبيق القيم الجديدة على العمليات والمكافآت المستقبلية، ولن تتم إعادة كتابة السجل السابق. هل تؤكد المتابعة؟`,
        `Impact preview:\n${impact}\n\nThe new values will apply to future operations and rewards. Existing history will not be rewritten. Confirm this change?`,
      ),
    );

    if (!approved) {
      event.preventDefault();
      return;
    }

    if (confirmation) {
      confirmation.value = "true";
    }
  }

  const fields = [
    [
      "loyaltyProgramName",
      t("اسم برنامج الولاء", "Programme name"),
      business.loyaltyProgramName ?? "",
      80,
    ],
    [
      "unitName",
      t("اسم الوحدة", "Unit name"),
      business.unitName,
      STANDARD_CARD_UNIT_LABEL_MAX_LENGTH,
    ],
    [
      "earnAmount",
      t("قيمة الإضافة", "Earn amount"),
      business.earnAmount,
      undefined,
    ],
    ["rewardName", t("اسم المكافأة", "Reward name"), business.rewardName, 100],
    [
      "rewardThreshold",
      t("الرصيد المطلوب للمكافأة", "Reward threshold"),
      business.rewardThreshold,
      undefined,
    ],
    [
      "rewardCode",
      t("كود المكافأة", "Reward code"),
      business.rewardCode ?? "",
      80,
    ],
  ] as const;

  return (
    <form
      action={action}
      onSubmit={confirmEconomicRuleChanges}
      className="overflow-hidden rounded-[var(--lf-radius-card)] border border-border bg-white p-5 shadow-sm sm:p-8"
      data-program-rules-form
    >
      <input type="hidden" name="confirmEconomicRules" defaultValue="false" />
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
            : status === "mode-blocked"
              ? t(
                  "لا يمكن تغيير نوع برنامج الولاء بعد وجود رصيد أو عمليات أو مكافآت. يلزم مسار ترحيل مخصص.",
                  "The loyalty programme type cannot be changed after balances, transactions, or rewards exist. A dedicated migration workflow is required.",
                )
              : status === "economic-confirmation-required"
                ? t(
                    "تغيير قيمة الإضافة أو هدف المكافأة أو نوعها بعد وجود سجل يحتاج معاينة التأثير والتأكيد الصريح.",
                    "Changing the earn amount, reward threshold, or reward type after history exists requires an impact preview and explicit confirmation.",
                  )
                : status === "subscription-restricted"
                  ? t(
                      "لا يمكن تعديل قواعد البرنامج في حالة الاشتراك الحالية.",
                      "Programme rules cannot be changed in the current subscription state.",
                    )
                  : t("راجع قواعد البرنامج.", "Review the programme rules.")}
        </p>
      ) : null}
      <h2 className="text-xl font-black text-foreground">
        {t("قواعد برنامج الولاء", "Loyalty programme rules")}
      </h2>
      <p className="mt-1 text-sm text-foreground-subtle">
        {t(
          "إعدادات الكسب والهدف والمكافأة الافتراضية.",
          "Earning, target and default reward compatibility settings.",
        )}
      </p>
      <div className="mt-4 rounded-[var(--lf-radius-input)] border border-primary/10 bg-primary-subtle/40 px-4 py-3 text-sm leading-6 text-primary">
        {fallbackRewardHelp(language)}
      </div>
      <div className="mt-6 grid gap-5 rounded-[var(--lf-radius-card)] bg-surface-subtle/60 p-4 sm:grid-cols-2 sm:p-6">
        {fields.map(([name, label, value, maxLength]) => (
          <label
            key={name}
            className="text-sm font-medium text-foreground-muted"
          >
            <span className="mb-2 block">{label}</span>
            {name === "unitName" ? (
              <UnitLabelInput
                name={name}
                defaultValue={value}
                required
                className={inputClass}
              />
            ) : (
              <input
                name={name}
                type={
                  name === "earnAmount" || name === "rewardThreshold"
                    ? "number"
                    : "text"
                }
                min={
                  name === "earnAmount" || name === "rewardThreshold"
                    ? 1
                    : undefined
                }
                defaultValue={value}
                required={[
                  "earnAmount",
                  "rewardName",
                  "rewardThreshold",
                ].includes(name)}
                maxLength={maxLength}
                className={inputClass}
              />
            )}
            {helpByField[name] ? (
              <span className="mt-2 block text-xs leading-5 text-foreground-subtle">
                {helpByField[name]}
              </span>
            ) : null}
          </label>
        ))}
        <label className="text-sm font-medium text-foreground-muted">
          <span className="mb-2 block">
            {t("لغة الكارت الافتراضية", "Default card language")}
          </span>
          <select
            name="cardDefaultLanguage"
            defaultValue={business.cardDefaultLanguage}
            className={inputClass}
          >
            <option value="AR">العربية (RTL)</option>
            <option value="EN">English (LTR)</option>
          </select>
        </label>
        <label className="text-sm font-medium text-foreground-muted">
          <span className="mb-2 block">{t("نظام الولاء", "Loyalty mode")}</span>
          <select
            name="loyaltyMode"
            defaultValue={business.loyaltyMode}
            className={inputClass}
          >
            <option value="VISITS">{t("زيارات / أختام", "Visits")}</option>
            <option value="POINTS">{t("نقاط", "Points")}</option>
            <option value="SALES_AMOUNT">
              {t("إجمالي المبيعات", "Sales amount")}
            </option>
          </select>
          <span className="mt-2 block text-xs leading-5 text-foreground-subtle">
            {fieldHelp.loyaltyMode}
          </span>
        </label>
        <label className="text-sm font-medium text-foreground-muted">
          <span className="mb-2 block">{t("نوع المكافأة", "Reward type")}</span>
          <select
            name="rewardType"
            defaultValue={business.rewardType}
            className={inputClass}
          >
            <option value="GIFT">{t("هدية", "Gift")}</option>
            <option value="PROMO_CODE">{t("رمز ترويجي", "Promo Code")}</option>
            <option value="DISCOUNT">{t("خصم", "Discount")}</option>
            <option value="CUSTOM">{t("مكافأة مخصصة", "Custom")}</option>
          </select>
        </label>
        <label className="text-sm font-medium text-foreground-muted sm:col-span-2">
          <span className="mb-2 block">
            {t("رسالة الترحيب داخل الكارت", "In-card welcome message")}
          </span>
          <textarea
            name="welcomeMessage"
            defaultValue={business.welcomeMessage ?? ""}
            maxLength={300}
            rows={3}
            className={`${inputClass} resize-y`}
          />
        </label>
        <label className="text-sm font-medium text-foreground-muted sm:col-span-2">
          <span className="mb-2 block">
            {t("وصف المكافأة", "Reward description")}
          </span>
          <textarea
            name="rewardDescription"
            defaultValue={business.rewardDescription ?? ""}
            maxLength={300}
            rows={3}
            className={`${inputClass} resize-y`}
          />
        </label>
      </div>
      <SaveButton language={language} />
    </form>
  );
}