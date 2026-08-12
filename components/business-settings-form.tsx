"use client";

/* eslint-disable @next/next/no-img-element */

import { useFormStatus } from "react-dom";
import { Building2, Save, Settings2 } from "lucide-react";

type Language = "AR" | "EN";
type FormAction = (formData: FormData) => void | Promise<void>;
type FormStatus = "saved" | "invalid" | undefined;

export type ProgramRulesBusiness = {
  loyaltyProgramName: string | null;
  welcomeMessage: string | null;
  cardDefaultLanguage: "AR" | "EN";
  loyaltyMode: "VISITS" | "POINTS" | "SALES_AMOUNT";
  unitName: string;
  rewardName: string;
  rewardType: "GIFT" | "PROMO_CODE" | "DISCOUNT" | "CUSTOM";
  rewardCode: string | null;
  rewardDescription: string | null;
  rewardThreshold: number;
  earnAmount: number;
};

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
    staffAttributionEnabled: boolean;
    staffAttributionRequired: boolean;
  };
  status: {
    profile: FormStatus;
    operations: FormStatus;
  };
  actions: {
    profile: FormAction;
    operations: FormAction;
  };
};

const formClass =
  "scroll-mt-24 rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-7";
const inputClass =
  "min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-3 text-foreground outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10";

function SubmitButton({ idle, pending }: { idle: string; pending: string }) {
  const { pending: isPending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={isPending}
      className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--lf-radius-input)] bg-primary px-6 py-3 font-bold text-white transition hover:bg-primary-hover disabled:cursor-wait disabled:opacity-60 sm:w-auto"
    >
      <Save className="size-4" aria-hidden="true" />
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
      <div
        id="profile-settings"
        className="scroll-mt-24"
        data-settings-profile="true"
      >
        <form action={actions.profile} className={formClass}>
          <Feedback status={status.profile} language={language} />
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-[var(--lf-radius-input)] bg-primary-soft text-primary">
              <Building2 className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {t("الملف التعريفي للنشاط", "Business profile")}
              </h2>
              <p className="mt-1 text-sm text-foreground-subtle">
                {t(
                  "بيانات الهوية والتواصل والموقع التي تخص النشاط.",
                  "Business identity, contact and location details.",
                )}
              </p>
            </div>
          </div>

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
                  className="mb-3 h-40 w-full rounded-[var(--lf-radius-input)] border border-border object-cover"
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
            <label className="flex min-h-11 items-center gap-3 self-end rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle p-4 text-sm font-semibold text-foreground-muted">
              <input
                name="removeCoverImage"
                type="checkbox"
                className="size-4"
              />
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
      </div>

      <div
        id="operations-settings"
        className="scroll-mt-24"
        data-settings-operations="true"
      >
        <form action={actions.operations} className={formClass}>
          <Feedback status={status.operations} language={language} />
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-[var(--lf-radius-input)] bg-primary-soft text-primary">
              <Settings2 className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {t("إعدادات التشغيل", "Operations settings")}
              </h2>
              <p className="mt-1 text-sm text-foreground-subtle">
                {t(
                  "حدد هل يجب تسجيل الموظف المسؤول عند إضافة رصيد.",
                  "Choose whether the responsible staff member is recorded when balance is added.",
                )}
              </p>
            </div>
          </div>
          <fieldset className="mt-5 grid gap-3">
            <legend className="sr-only">
              {t("تسجيل الموظف المسؤول", "Staff attribution")}
            </legend>
            {[
              {
                value: "OFF",
                ar: "إيقاف",
                en: "Off",
                arDescription: "لا يُطلب اختيار موظف عند إضافة الرصيد.",
                enDescription:
                  "No staff member is selected when adding balance.",
              },
              {
                value: "OPTIONAL",
                ar: "اختياري",
                en: "Optional",
                arDescription: "يمكن تسجيل الموظف المسؤول عند توفره.",
                enDescription: "The responsible staff member may be recorded.",
              },
              {
                value: "REQUIRED",
                ar: "إجباري",
                en: "Required",
                arDescription: "يجب اختيار موظف مسؤول قبل إتمام العملية.",
                enDescription: "A responsible staff member must be selected.",
              },
            ].map((option) => (
              <label
                key={option.value}
                className="flex cursor-pointer items-start gap-3 rounded-[var(--lf-radius-input)] border border-border bg-white p-4 transition hover:border-primary/30 hover:bg-primary-soft/40"
              >
                <input
                  type="radio"
                  name="staffAttributionMode"
                  value={option.value}
                  defaultChecked={staffAttributionMode === option.value}
                  className="size-4"
                />
                <span>
                  <span className="block font-semibold text-foreground">
                    {t(option.ar, option.en)}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-foreground-subtle">
                    {t(option.arDescription, option.enDescription)}
                  </span>
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
    </div>
  );
}
