"use client";

/* eslint-disable @next/next/no-img-element */

import { useFormStatus } from "react-dom";

type Language = "AR" | "EN";
type FormAction = (formData: FormData) => void | Promise<void>;
type FormStatus = "saved" | "invalid" | undefined;

type BusinessSettingsFormProps = {
  language: Language;
  business: {
    name: string;
    slug: string;
    coverImageUrl: string | null;
    currency: string | null;
    timezone: string | null;
    industry: string | null;
    website: string | null;
    email: string | null;
    country: string | null;
    city: string | null;
    taxNumber: string | null;
    employeeCount: number | null;
    description: string | null;
    instagramUrl: string | null;
    loyaltyProgramName: string | null;
    pointsName: string | null;
    welcomeMessage: string | null;
    cardDefaultLanguage: "AR" | "EN";
    staffAttributionEnabled: boolean;
    staffAttributionRequired: boolean;
    loyaltyMode: "VISITS" | "POINTS" | "SALES_AMOUNT";
    unitName: string;
    rewardName: string;
    rewardType: "GIFT" | "PROMO_CODE" | "DISCOUNT" | "CUSTOM";
    rewardCode: string | null;
    rewardDescription: string | null;
    rewardThreshold: number;
    earnAmount: number;
    whatsappWelcomeMessage: string;
    whatsappBalanceMessage: string;
    whatsappRewardMessage: string;
  };
  status: {
    profile: FormStatus;
    program: FormStatus;
    messages: FormStatus;
    operations: FormStatus;
  };
  actions: {
    profile: FormAction;
    program: FormAction;
    messages: FormAction;
    operations: FormAction;
  };
};

const formClass =
  "rounded-[var(--lf-radius-card)] border border-border bg-white p-6 shadow-sm sm:p-8";
const inputClass =
  "w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-4 text-foreground outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/20";

function SubmitButton({
  idle,
  pending,
}: {
  idle: string;
  pending: string;
}) {
  const { pending: isPending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={isPending}
      className="mt-6 rounded-[var(--lf-radius-input)] bg-foreground px-6 py-4 font-semibold text-white transition hover:bg-primary disabled:cursor-wait disabled:opacity-60"
    >
      {isPending ? pending : idle}
    </button>
  );
}

function Feedback({
  status,
  language,
}: {
  status: FormStatus;
  language: Language;
}) {
  if (!status) return null;
  const success = status === "saved";
  return (
    <p
      role="status"
      aria-live="polite"
      className={`mb-5 rounded-[var(--lf-radius-input)] border px-4 py-3 text-sm font-semibold ${
        success
          ? "border-success/30 bg-success-subtle text-success"
          : "border-danger/30 bg-danger-subtle text-danger"
      }`}
    >
      {success
        ? language === "AR"
          ? "تم حفظ هذا القسم بنجاح."
          : "This section was saved successfully."
        : language === "AR"
          ? "راجع بيانات هذا القسم."
          : "Review the fields in this section."}
    </p>
  );
}

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block text-sm font-medium text-foreground-muted"
    >
      {children}
    </label>
  );
}

export default function BusinessSettingsForm({
  language,
  business,
  status,
  actions,
}: BusinessSettingsFormProps) {
  const t = (ar: string, en: string) => (language === "AR" ? ar : en);
  const staffAttributionMode = !business.staffAttributionEnabled
    ? "OFF"
    : business.staffAttributionRequired
      ? "REQUIRED"
      : "OPTIONAL";

  return (
    <div className="space-y-6">
      <form action={actions.profile} className={formClass}>
        <Feedback status={status.profile} language={language} />
        <h2 className="text-xl font-bold text-foreground">
          {t("الملف التعريفي للنشاط", "Business profile")}
        </h2>
        <p className="mt-1 text-sm text-foreground-subtle">
          {t(
            "بيانات الهوية والتواصل والموقع التي تخص النشاط.",
            "Business identity, contact and location details.",
          )}
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="profile-name">
              {t("اسم النشاط", "Business name")}
            </FieldLabel>
            <input
              id="profile-name"
              name="name"
              defaultValue={business.name}
              required
              minLength={2}
              maxLength={80}
              className={inputClass}
            />
          </div>
          <div>
            <FieldLabel htmlFor="profile-industry">
              {t("نوع النشاط", "Business type")}
            </FieldLabel>
            <input
              id="profile-industry"
              name="industry"
              defaultValue={business.industry ?? ""}
              maxLength={100}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="profile-description">
              {t("وصف النشاط", "Business description")}
            </FieldLabel>
            <textarea
              id="profile-description"
              name="description"
              defaultValue={business.description ?? ""}
              maxLength={500}
              rows={3}
              className={inputClass}
            />
          </div>
          <div>
            <FieldLabel htmlFor="profile-email">
              {t("البريد الإلكتروني", "Business email")}
            </FieldLabel>
            <input
              id="profile-email"
              name="email"
              type="email"
              defaultValue={business.email ?? ""}
              maxLength={255}
              className={inputClass}
            />
          </div>
          <div>
            <FieldLabel htmlFor="profile-website">
              {t("الموقع الإلكتروني", "Website")}
            </FieldLabel>
            <input
              id="profile-website"
              name="website"
              inputMode="url"
              defaultValue={business.website ?? ""}
              maxLength={300}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="profile-instagram">Instagram URL</FieldLabel>
            <input
              id="profile-instagram"
              name="instagramUrl"
              inputMode="url"
              defaultValue={business.instagramUrl ?? ""}
              maxLength={300}
              className={inputClass}
            />
          </div>
          <div>
            <FieldLabel htmlFor="profile-country">
              {t("الدولة", "Country")}
            </FieldLabel>
            <input
              id="profile-country"
              name="country"
              defaultValue={business.country ?? ""}
              maxLength={100}
              className={inputClass}
            />
          </div>
          <div>
            <FieldLabel htmlFor="profile-city">
              {t("المدينة", "City")}
            </FieldLabel>
            <input
              id="profile-city"
              name="city"
              defaultValue={business.city ?? ""}
              maxLength={100}
              className={inputClass}
            />
          </div>
          <div>
            <FieldLabel htmlFor="profile-currency">
              {t("العملة", "Currency")}
            </FieldLabel>
            <select
              id="profile-currency"
              name="currency"
              defaultValue={business.currency ?? ""}
              className={inputClass}
            >
              <option value="">{t("بدون تحديد", "Not specified")}</option>
              {["AED", "EGP", "EUR", "GBP", "KWD", "QAR", "SAR", "USD"].map(
                (currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ),
              )}
            </select>
          </div>
          <div>
            <FieldLabel htmlFor="profile-timezone">
              {t("المنطقة الزمنية", "Timezone")}
            </FieldLabel>
            <input
              id="profile-timezone"
              name="timezone"
              defaultValue={business.timezone ?? ""}
              maxLength={100}
              placeholder="Africa/Cairo"
              className={inputClass}
            />
          </div>
          <div>
            <FieldLabel htmlFor="profile-tax">
              {t("الرقم الضريبي", "Tax number")}
            </FieldLabel>
            <input
              id="profile-tax"
              name="taxNumber"
              defaultValue={business.taxNumber ?? ""}
              maxLength={100}
              className={inputClass}
            />
          </div>
          <div>
            <FieldLabel htmlFor="profile-employees">
              {t("عدد الموظفين", "Employee count")}
            </FieldLabel>
            <input
              id="profile-employees"
              name="employeeCount"
              type="number"
              min={0}
              defaultValue={business.employeeCount ?? ""}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="profile-cover-url">
              {t("رابط صورة الغلاف", "Cover image URL")}
            </FieldLabel>
            {business.coverImageUrl ? (
              <img
                src={business.coverImageUrl}
                alt=""
                className="mb-3 h-36 w-full rounded-[var(--lf-radius-input)] object-cover"
              />
            ) : null}
            <input
              id="profile-cover-url"
              name="coverImageUrl"
              type="url"
              defaultValue={
                business.coverImageUrl?.startsWith("http")
                  ? business.coverImageUrl
                  : ""
              }
              maxLength={500}
              className={inputClass}
            />
          </div>
          <div>
            <FieldLabel htmlFor="profile-cover-file">
              {t("رفع صورة غلاف", "Upload cover image")}
            </FieldLabel>
            <input
              id="profile-cover-file"
              name="coverImageFile"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className={inputClass}
            />
          </div>
          <label className="flex items-center gap-3 self-end rounded-[var(--lf-radius-input)] border border-border p-4">
            <input name="removeCoverImage" type="checkbox" className="size-4" />
            {t("حذف صورة الغلاف الحالية", "Remove current cover image")}
          </label>
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="profile-slug">
              {t("رابط النشاط", "Business URL")}
            </FieldLabel>
            <input
              id="profile-slug"
              value={business.slug}
              disabled
              className={`${inputClass} cursor-not-allowed bg-surface-subtle`}
            />
          </div>
        </div>
        <SubmitButton
          idle={t("حفظ الملف التعريفي", "Save business profile")}
          pending={t("جارٍ الحفظ…", "Saving…")}
        />
      </form>

      <form action={actions.program} className={formClass}>
        <Feedback status={status.program} language={language} />
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
          <div>
            <FieldLabel htmlFor="program-name">
              {t("اسم برنامج الولاء", "Programme name")}
            </FieldLabel>
            <input
              id="program-name"
              name="loyaltyProgramName"
              defaultValue={business.loyaltyProgramName ?? ""}
              maxLength={80}
              className={inputClass}
            />
          </div>
          <div>
            <FieldLabel htmlFor="program-points-name">
              {t("اسم النقاط", "Points name")}
            </FieldLabel>
            <input
              id="program-points-name"
              name="pointsName"
              defaultValue={business.pointsName ?? ""}
              maxLength={30}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="program-welcome">
              {t("رسالة الترحيب داخل الكارت", "In-card welcome message")}
            </FieldLabel>
            <textarea
              id="program-welcome"
              name="welcomeMessage"
              defaultValue={business.welcomeMessage ?? ""}
              maxLength={300}
              rows={3}
              className={inputClass}
            />
          </div>
          <div>
            <FieldLabel htmlFor="program-language">
              {t("لغة الكارت الافتراضية", "Default card language")}
            </FieldLabel>
            <select
              id="program-language"
              name="cardDefaultLanguage"
              defaultValue={business.cardDefaultLanguage}
              className={inputClass}
            >
              <option value="AR">العربية (RTL)</option>
              <option value="EN">English (LTR)</option>
            </select>
          </div>
          <div>
            <FieldLabel htmlFor="program-mode">
              {t("نظام الولاء", "Loyalty mode")}
            </FieldLabel>
            <select
              id="program-mode"
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
          </div>
          <div>
            <FieldLabel htmlFor="program-unit">
              {t("اسم الوحدة", "Unit name")}
            </FieldLabel>
            <input
              id="program-unit"
              name="unitName"
              defaultValue={business.unitName}
              required
              maxLength={30}
              className={inputClass}
            />
          </div>
          <div>
            <FieldLabel htmlFor="program-earn">
              {t("قيمة الإضافة", "Earn amount")}
            </FieldLabel>
            <input
              id="program-earn"
              name="earnAmount"
              type="number"
              min={1}
              defaultValue={business.earnAmount}
              required
              className={inputClass}
            />
          </div>
          <div>
            <FieldLabel htmlFor="program-reward">
              {t("اسم المكافأة", "Reward name")}
            </FieldLabel>
            <input
              id="program-reward"
              name="rewardName"
              defaultValue={business.rewardName}
              required
              maxLength={100}
              className={inputClass}
            />
          </div>
          <div>
            <FieldLabel htmlFor="program-threshold">
              {t("الرصيد المطلوب للمكافأة", "Reward threshold")}
            </FieldLabel>
            <input
              id="program-threshold"
              name="rewardThreshold"
              type="number"
              min={1}
              defaultValue={business.rewardThreshold}
              required
              className={inputClass}
            />
          </div>
          <div>
            <FieldLabel htmlFor="program-reward-type">
              {t("نوع المكافأة", "Reward type")}
            </FieldLabel>
            <select
              id="program-reward-type"
              name="rewardType"
              defaultValue={business.rewardType}
              className={inputClass}
            >
              <option value="GIFT">{t("هدية", "Gift")}</option>
              <option value="PROMO_CODE">Promo Code</option>
              <option value="DISCOUNT">{t("خصم", "Discount")}</option>
              <option value="CUSTOM">{t("مكافأة مخصصة", "Custom")}</option>
            </select>
          </div>
          <div>
            <FieldLabel htmlFor="program-reward-code">
              {t("كود المكافأة", "Reward code")}
            </FieldLabel>
            <input
              id="program-reward-code"
              name="rewardCode"
              defaultValue={business.rewardCode ?? ""}
              maxLength={80}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel htmlFor="program-reward-description">
              {t("وصف المكافأة", "Reward description")}
            </FieldLabel>
            <textarea
              id="program-reward-description"
              name="rewardDescription"
              defaultValue={business.rewardDescription ?? ""}
              maxLength={300}
              rows={3}
              className={inputClass}
            />
          </div>
        </div>
        <SubmitButton
          idle={t("حفظ قواعد البرنامج", "Save programme rules")}
          pending={t("جارٍ الحفظ…", "Saving…")}
        />
      </form>

      <form action={actions.messages} className={formClass}>
        <Feedback status={status.messages} language={language} />
        <h2 className="text-xl font-bold text-foreground">
          {t("رسائل العملاء", "Customer messages")}
        </h2>
        <p className="mt-1 text-sm text-foreground-subtle">
          {t(
            "يتم التحقق من هذه القوالب فقط عند حفظ هذا القسم.",
            "These templates are validated only when this section is saved.",
          )}
        </p>
        <div className="mt-4 rounded-[var(--lf-radius-card)] bg-primary-subtle p-4 text-sm text-primary">
          <p className="font-semibold">{t("المتغيرات المتاحة", "Available variables")}</p>
          <p className="mt-2 break-words font-mono text-xs">
            {"{customer} {business} {balance} {unit} {reward} {remaining} {card_link}"}
          </p>
        </div>
        {[
          {
            id: "messages-welcome",
            name: "whatsappWelcomeMessage",
            label: t("رسالة الترحيب", "Welcome message"),
            value: business.whatsappWelcomeMessage,
          },
          {
            id: "messages-balance",
            name: "whatsappBalanceMessage",
            label: t("رسالة تحديث الرصيد", "Balance update message"),
            value: business.whatsappBalanceMessage,
          },
          {
            id: "messages-reward",
            name: "whatsappRewardMessage",
            label: t("رسالة جاهزية المكافأة", "Reward-ready message"),
            value: business.whatsappRewardMessage,
          },
        ].map((message) => (
          <div key={message.name} className="mt-5">
            <FieldLabel htmlFor={message.id}>{message.label}</FieldLabel>
            <textarea
              id={message.id}
              name={message.name}
              defaultValue={message.value}
              dir="auto"
              rows={6}
              minLength={1}
              maxLength={1500}
              required
              className={inputClass}
            />
          </div>
        ))}
        <SubmitButton
          idle={t("حفظ رسائل العملاء", "Save customer messages")}
          pending={t("جارٍ الحفظ…", "Saving…")}
        />
      </form>

      <form action={actions.operations} className={formClass}>
        <Feedback status={status.operations} language={language} />
        <h2 className="text-xl font-bold text-foreground">
          {t("إعدادات التشغيل", "Operations settings")}
        </h2>
        <p className="mt-1 text-sm text-foreground-subtle">
          {t(
            "حدد هل يجب تسجيل الموظف المسؤول عند إضافة رصيد.",
            "Choose whether the responsible staff member is recorded when balance is added.",
          )}
        </p>
        <fieldset className="mt-5 grid gap-3">
          <legend className="sr-only">
            {t("تسجيل الموظف المسؤول", "Staff attribution")}
          </legend>
          {[
            {
              value: "OFF",
              ar: "إيقاف",
              en: "Off",
            },
            {
              value: "OPTIONAL",
              ar: "اختياري",
              en: "Optional",
            },
            {
              value: "REQUIRED",
              ar: "إجباري",
              en: "Required",
            },
          ].map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-3 rounded-[var(--lf-radius-input)] border border-border p-4"
            >
              <input
                type="radio"
                name="staffAttributionMode"
                value={option.value}
                defaultChecked={staffAttributionMode === option.value}
                className="size-4"
              />
              <span className="font-semibold text-foreground">
                {t(option.ar, option.en)}
              </span>
            </label>
          ))}
        </fieldset>
        <SubmitButton
          idle={t("حفظ إعدادات التشغيل", "Save operations settings")}
          pending={t("جارٍ الحفظ…", "Saving…")}
        />
      </form>
    </div>
  );
}
