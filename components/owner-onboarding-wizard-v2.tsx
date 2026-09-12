"use client";

import { useCallback, useRef, useState } from "react";
import { TRIAL_DURATION_DAYS } from "@loyalflow/domain/billing/trial-core";

import { BusinessLogoImage } from "@/components/business-logo-image";
import {
  CountrySelector,
  type CountrySelectorHandle,
} from "@/components/onboarding/country-selector";
import { StandardCardSetup } from "@/components/standard-card-setup";
import { UnitLabelInput } from "@/components/unit-label-input";
import {
  BUSINESS_LOGO_ACCEPT,
  BUSINESS_LOGO_MAX_BYTES,
  isBusinessLogoMimeType,
} from "@/lib/branding/image-policy";
import type { SupportedLocale } from "@/lib/i18n/config";
import {
  createOwnerOnboardingCardPreviewState,
  updateOwnerOnboardingCardPreviewState,
} from "@/lib/onboarding/owner-onboarding-card-preview";
import { getOwnerOnboardingCopy } from "@/lib/onboarding/owner-onboarding-copy";
import {
  OWNER_ONBOARDING_DEFAULTS,
  resolveOwnerOnboardingCountryProfile,
} from "@/lib/onboarding/owner-onboarding-defaults";
import {
  normalizeOwnerOnboardingPhone,
  type OwnerOnboardingFieldError,
  validateOwnerOnboardingThroughStep,
} from "@/lib/onboarding/owner-onboarding-validation";
import {
  COUNTRY_OPTIONS,
  SUPPORTED_CURRENCY_CODES,
} from "@/lib/onboarding/countries";

type Action = (
  formData: FormData,
) => Promise<{ saved?: boolean; error?: string }>;

type ReviewSnapshot = {
  businessName: string;
  country: string;
  city: string;
  industry: string;
  currency: string;
  timezone: string;
  loyaltyMode: string;
  unitName: string;
  rewardName: string;
  rewardThreshold: string;
  earnAmount: string;
  primaryColor: string;
};

export const OWNER_ONBOARDING_V2_STEP_COUNT = 4;

function reviewValue(formData: FormData, field: string, fallback = "") {
  const value = String(formData.get(field) ?? "").trim();
  return value || fallback;
}

function validationStepToV2(step: OwnerOnboardingFieldError["step"]) {
  return step === 0 ? 0 : 1;
}

export function OwnerOnboardingWizardV2({
  locale,
  draft,
  saveAction,
  launchAction,
}: {
  locale: SupportedLocale;
  draft: Record<string, unknown>;
  saveAction: Action;
  launchAction: (formData: FormData) => Promise<void>;
}) {
  const copy = getOwnerOnboardingCopy(locale);
  const sections =
    locale === "ar"
      ? ["النشاط", "برنامج الولاء", "بطاقة الولاء", "المراجعة والإطلاق"]
      : ["Business", "Loyalty Program", "Loyalty Card", "Review & Launch"];
  const labels =
    locale === "ar"
      ? {
          summary: "ملخص الإعداد",
          business: "النشاط",
          program: "برنامج الولاء",
          reward: "المكافأة",
          card: "بطاقة الولاء",
          trial: "الفترة التجريبية",
          trialValue: `${TRIAL_DURATION_DAYS} يومًا`,
          logoReady: "الشعار جاهز",
          logoDefault: "بدون شعار مخصص",
          pointsEarn: "قيمة الكسب لكل عملية",
          fixedVisit: "كل عملية مؤهلة تضيف زيارة واحدة.",
          salesEarn: "يتم احتساب قيمة البيع الفعلية بوحدات العملة الصحيحة.",
        }
      : {
          summary: "Setup summary",
          business: "Business",
          program: "Loyalty program",
          reward: "Reward",
          card: "Loyalty card",
          trial: "Trial",
          trialValue: `${TRIAL_DURATION_DAYS} days`,
          logoReady: "Logo ready",
          logoDefault: "No custom logo",
          pointsEarn: "Earn amount per action",
          fixedVisit: "Each qualifying action adds exactly one visit.",
          salesEarn: "The actual sale amount is recorded in whole currency units.",
        };

  const formRef = useRef<HTMLFormElement>(null);
  const countrySelectorRef = useRef<CountrySelectorHandle>(null);
  const [step, setStep] = useState(0);
  const countryProfile = resolveOwnerOnboardingCountryProfile(draft);
  const [country, setCountry] = useState(countryProfile.country);
  const [currency, setCurrency] = useState(countryProfile.currency);
  const [timezone, setTimezone] = useState(countryProfile.timezone);
  const [phone, setPhone] = useState(String(draft.contactPhone || ""));
  const [notice, setNotice] = useState("");
  const [logoPreview, setLogoPreview] = useState(String(draft.logoUrl || ""));
  const [cardPreview, setCardPreview] = useState(() =>
    createOwnerOnboardingCardPreviewState(draft),
  );
  const [loyaltyMode, setLoyaltyMode] = useState(cardPreview.loyaltyMode);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [review, setReview] = useState<ReviewSnapshot>({
    businessName: String(draft.name || ""),
    country,
    city: String(draft.city || ""),
    industry: String(draft.industry || ""),
    currency,
    timezone,
    loyaltyMode: String(draft.loyaltyMode || OWNER_ONBOARDING_DEFAULTS.loyaltyMode),
    unitName: String(draft.unitName || OWNER_ONBOARDING_DEFAULTS.unitName),
    rewardName: String(draft.rewardName || OWNER_ONBOARDING_DEFAULTS.rewardName),
    rewardThreshold: String(
      draft.rewardThreshold || OWNER_ONBOARDING_DEFAULTS.rewardThreshold,
    ),
    earnAmount: String(draft.earnAmount || OWNER_ONBOARDING_DEFAULTS.earnAmount),
    primaryColor: String(draft.primaryColor || "#111827"),
  });

  const setFormElement = useCallback((node: HTMLFormElement | null) => {
    formRef.current = node;
    if (node) node.dataset.ownerHydrated = "true";
  }, []);

  const selectedCountry = COUNTRY_OPTIONS.find(
    (option) => option.name === country,
  );
  const timezoneOptions = selectedCountry?.timezones?.length
    ? selectedCountry.timezones
    : [timezone];
  const sectionClass = (index: number) =>
    step === index ? "space-y-4" : "hidden";

  const formDataForValidation = () => {
    if (!formRef.current) return null;
    const formData = new FormData(formRef.current);
    const normalizedPhone = normalizeOwnerOnboardingPhone(phone, country);
    formData.set("contactPhone", normalizedPhone);
    setPhone(normalizedPhone);
    return formData;
  };

  const refreshReview = (formData: FormData) => {
    setReview({
      businessName: reviewValue(formData, "name"),
      country: reviewValue(formData, "country", country),
      city: reviewValue(formData, "city"),
      industry: reviewValue(formData, "industry"),
      currency: reviewValue(formData, "currency", currency),
      timezone: reviewValue(formData, "timezone", timezone),
      loyaltyMode: reviewValue(formData, "loyaltyMode", loyaltyMode),
      unitName: reviewValue(
        formData,
        "unitName",
        OWNER_ONBOARDING_DEFAULTS.unitName,
      ),
      rewardName: reviewValue(
        formData,
        "rewardName",
        OWNER_ONBOARDING_DEFAULTS.rewardName,
      ),
      rewardThreshold: reviewValue(
        formData,
        "rewardThreshold",
        String(OWNER_ONBOARDING_DEFAULTS.rewardThreshold),
      ),
      earnAmount: reviewValue(
        formData,
        "earnAmount",
        String(OWNER_ONBOARDING_DEFAULTS.earnAmount),
      ),
      primaryColor: reviewValue(formData, "primaryColor", "#111827"),
    });
  };

  const focusValidationField = (field: OwnerOnboardingFieldError["field"]) => {
    window.requestAnimationFrame(() => {
      const container = formRef.current?.querySelector<HTMLElement>(
        `[data-onboarding-field="${field}"]`,
      );
      const target = container?.matches("input, select, textarea")
        ? container
        : container?.querySelector<HTMLElement>("input, select, textarea");
      target?.focus({ preventScroll: true });
      (container || target)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const showValidationError = (error: OwnerOnboardingFieldError) => {
    setFieldErrors({ [error.field]: error.message });
    setNotice(`${copy.fixField}: ${error.message}`);
    setStep(validationStepToV2(error.step));
    focusValidationField(error.field);
  };

  const validateForDestination = (destination: number, formData: FormData) => {
    const maxLegacyStep = destination <= 1 ? 0 : 2;
    return validateOwnerOnboardingThroughStep(maxLegacyStep, formData, locale);
  };

  const navigateToStep = (destination: number) => {
    const bounded = Math.max(0, Math.min(OWNER_ONBOARDING_V2_STEP_COUNT - 1, destination));
    countrySelectorRef.current?.close();
    if (bounded <= step) {
      setStep(bounded);
      return;
    }
    const formData = formDataForValidation();
    if (!formData) return;
    const error = validateForDestination(bounded, formData);
    if (error) {
      showValidationError(error);
      return;
    }
    setFieldErrors({});
    setNotice("");
    if (bounded === 3) refreshReview(formData);
    setStep(bounded);
  };

  const goNext = () => navigateToStep(step + 1);

  const updateCardPreview = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.currentTarget;
    setCardPreview((current) =>
      updateOwnerOnboardingCardPreviewState(current, name, value),
    );
  };

  return (
    <form
      ref={setFormElement}
      noValidate
      data-owner-step={step + 1}
      data-owner-hydrated="false"
      data-owner-onboarding-version="2"
      className="mx-auto min-w-0 max-w-6xl overflow-clip rounded-3xl border border-border/80 bg-white shadow-[0_24px_60px_rgb(15_23_42/0.1)]"
    >
      <div className="grid min-w-0 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="hidden border-e border-border bg-surface-subtle/70 p-6 lg:block">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
            {copy.step} {step + 1} {copy.of} {OWNER_ONBOARDING_V2_STEP_COUNT}
          </p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white" role="progressbar" aria-label={copy.progressLabel} aria-valuemin={1} aria-valuemax={OWNER_ONBOARDING_V2_STEP_COUNT} aria-valuenow={step + 1}>
            <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${((step + 1) / OWNER_ONBOARDING_V2_STEP_COUNT) * 100}%` }} />
          </div>
          <nav aria-label={copy.navLabel} className="mt-7 grid gap-2">
            {sections.map((section, index) => (
              <button type="button" key={section} onClick={() => navigateToStep(index)} aria-current={step === index ? "step" : undefined} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-start text-sm font-bold transition ${step === index ? "bg-white text-primary shadow-sm ring-1 ring-border" : "text-foreground-muted hover:bg-white/75 hover:text-foreground"}`}>
                <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-xs ${step === index ? "bg-primary text-white" : index < step ? "bg-primary/10 text-primary" : "bg-white text-foreground-subtle"}`}>{index + 1}</span>
                <span>{section}</span>
              </button>
            ))}
          </nav>
          <div className="mt-8 rounded-2xl border border-primary/10 bg-primary/5 p-4 text-xs leading-5 text-foreground-muted">{copy.reviewHint}</div>
        </aside>

        <div className="min-w-0 space-y-6 p-4 pb-28 sm:p-8 sm:pb-8 lg:p-10">
          <div className="lg:hidden" data-testid="owner-mobile-step-header" data-owner-step={step + 1}>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-foreground-muted">{copy.step} {step + 1} {copy.of} {OWNER_ONBOARDING_V2_STEP_COUNT}</p>
                <h1 className="mt-1 text-xl font-black">{sections[step]}</h1>
              </div>
              <span className="text-sm font-bold text-foreground-muted">{Math.round(((step + 1) / OWNER_ONBOARDING_V2_STEP_COUNT) * 100)}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-subtle" role="progressbar" aria-label={copy.progressLabel} aria-valuemin={1} aria-valuemax={OWNER_ONBOARDING_V2_STEP_COUNT} aria-valuenow={step + 1}>
              <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${((step + 1) / OWNER_ONBOARDING_V2_STEP_COUNT) * 100}%` }} />
            </div>
          </div>

          {notice ? (
            <p role={Object.keys(fieldErrors).length ? "alert" : "status"} className={`rounded-xl p-3 text-sm font-semibold ${Object.keys(fieldErrors).length ? "border border-danger/30 bg-danger-subtle text-danger" : "border border-success/20 bg-success-subtle text-success"}`}>{notice}</p>
          ) : null}

          <input type="hidden" name="currency" value={currency} />
          <input type="hidden" name="timezone" value={timezone} />

          <section className={sectionClass(0)} data-owner-step-panel="1">
            <h2 className="text-2xl font-bold">{sections[0]}</h2>
            <label className="block text-sm font-bold">
              {copy.businessName}
              <input data-onboarding-field="name" name="name" aria-invalid={Boolean(fieldErrors.name)} defaultValue={String(draft.name || "")} onChange={updateCardPreview} placeholder={copy.businessName} className="mt-2 min-h-12 w-full rounded-xl border px-4 py-3" />
              {fieldErrors.name ? <p className="mt-1 text-sm font-semibold text-danger">{fieldErrors.name}</p> : null}
            </label>
            <div data-onboarding-field="countrySelector">
              <p className="mb-2 text-sm font-bold">{copy.country}</p>
              <CountrySelector ref={countrySelectorRef} name="country" value={country} onChange={(item) => { setCountry(item.name); if (item.currency) setCurrency(item.currency); setTimezone(item.timezone); setFieldErrors({}); }} />
              {fieldErrors.countrySelector ? <p className="mt-1 text-sm font-semibold text-danger">{fieldErrors.countrySelector}</p> : null}
            </div>
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <label className="block text-sm font-bold">{copy.city}<input name="city" defaultValue={String(draft.city || "")} placeholder={copy.city} className="mt-2 min-h-12 w-full min-w-0 rounded-xl border px-4 py-3" /></label>
              <div>
                <label htmlFor="owner-business-phone-v2" className="text-sm font-bold">{copy.businessPhone}</label>
                <input id="owner-business-phone-v2" data-onboarding-field="contactPhone" name="contactPhone" aria-invalid={Boolean(fieldErrors.contactPhone)} value={phone} onChange={(event) => setPhone(event.target.value)} onBlur={() => setPhone(normalizeOwnerOnboardingPhone(phone, country))} inputMode="tel" autoComplete="tel" placeholder="01212312746 or +201212312746" className="mt-2 min-h-12 w-full min-w-0 rounded-xl border px-4 py-3" />
                <p className="mt-1 text-xs text-foreground-muted">{copy.phoneHint}</p>
                {fieldErrors.contactPhone ? <p className="mt-1 text-sm font-semibold text-danger">{fieldErrors.contactPhone}</p> : null}
              </div>
            </div>
            <label className="block text-sm font-bold">{copy.industry}<input name="industry" defaultValue={String(draft.industry || "")} placeholder={copy.industryPlaceholder} className="mt-2 min-h-12 w-full rounded-xl border px-4 py-3" /></label>
            <label className="block text-sm font-bold">{copy.currency}<input data-onboarding-field="currencyInput" value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} list="owner-currency-options-v2" aria-invalid={Boolean(fieldErrors.currencyInput)} autoComplete="off" className="mt-2 min-h-12 w-full rounded-xl border px-4 py-3" /><datalist id="owner-currency-options-v2">{SUPPORTED_CURRENCY_CODES.map((code) => <option key={code} value={code} />)}</datalist>{fieldErrors.currencyInput ? <p className="mt-1 text-sm font-semibold text-danger">{fieldErrors.currencyInput}</p> : null}</label>
            <label className="block text-sm font-bold">{copy.timezone}<input data-onboarding-field="timezoneInput" value={timezone} onChange={(event) => setTimezone(event.target.value)} list="owner-timezone-options-v2" aria-invalid={Boolean(fieldErrors.timezoneInput)} autoComplete="off" className="mt-2 min-h-12 w-full rounded-xl border px-4 py-3" /><datalist id="owner-timezone-options-v2">{timezoneOptions.map((zone) => <option key={zone} value={zone} />)}</datalist>{fieldErrors.timezoneInput ? <p className="mt-1 text-sm font-semibold text-danger">{fieldErrors.timezoneInput}</p> : null}</label>
          </section>

          <section className={sectionClass(1)} data-owner-step-panel="2">
            <h2 className="text-2xl font-bold">{sections[1]}</h2>
            <label className="block text-sm font-bold">{copy.loyaltyMode}<select data-onboarding-field="loyaltyMode" name="loyaltyMode" aria-invalid={Boolean(fieldErrors.loyaltyMode)} value={loyaltyMode} onChange={(event) => { setLoyaltyMode(event.target.value as typeof loyaltyMode); updateCardPreview(event); }} className="mt-2 min-h-12 w-full rounded-xl border px-4 py-3"><option value="VISITS">{copy.visits}</option><option value="POINTS">{copy.points}</option><option value="SALES_AMOUNT">{copy.salesAmount}</option></select></label>
            <label className="block text-sm font-bold">{copy.loyaltyUnit}<UnitLabelInput data-onboarding-field="unitName" name="unitName" aria-invalid={Boolean(fieldErrors.unitName)} defaultValue={String(draft.unitName || OWNER_ONBOARDING_DEFAULTS.unitName)} onChange={updateCardPreview} className="mt-2 min-h-12 w-full rounded-xl border px-4 py-3" /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-bold">{copy.reward}<input data-onboarding-field="rewardName" name="rewardName" aria-invalid={Boolean(fieldErrors.rewardName)} defaultValue={String(draft.rewardName || OWNER_ONBOARDING_DEFAULTS.rewardName)} onChange={updateCardPreview} className="mt-2 min-h-12 w-full rounded-xl border px-4 py-3" /></label>
              <label className="block text-sm font-bold">{copy.target}<input data-onboarding-field="rewardThreshold" name="rewardThreshold" aria-invalid={Boolean(fieldErrors.rewardThreshold)} type="number" min="1" step="1" defaultValue={String(draft.rewardThreshold || OWNER_ONBOARDING_DEFAULTS.rewardThreshold)} onChange={updateCardPreview} className="mt-2 min-h-12 w-full rounded-xl border px-4 py-3" /></label>
            </div>
            {loyaltyMode === "POINTS" ? (
              <label className="block text-sm font-bold">{copy.earnAmount}<input data-onboarding-field="earnAmount" name="earnAmount" aria-invalid={Boolean(fieldErrors.earnAmount)} type="number" min="1" step="1" defaultValue={String(draft.earnAmount || OWNER_ONBOARDING_DEFAULTS.earnAmount)} className="mt-2 min-h-12 w-full rounded-xl border px-4 py-3" /></label>
            ) : (
              <><input type="hidden" name="earnAmount" value="1" /><p className="rounded-xl border bg-surface-subtle p-4 text-sm text-foreground-muted">{loyaltyMode === "VISITS" ? labels.fixedVisit : labels.salesEarn}</p></>
            )}
          </section>

          <section className={sectionClass(2)} data-owner-step-panel="3">
            <h2 className="text-2xl font-bold">{sections[2]}</h2>
            <p className="text-sm text-foreground-muted">{copy.cardHint}</p>
            <div className="flex items-center gap-4 rounded-xl border bg-surface-subtle p-4">
              <div className="flex size-24 items-center justify-center overflow-hidden rounded-xl border bg-white">
                {logoPreview ? <BusinessLogoImage src={logoPreview} alt={copy.identity} /> : <span className="text-3xl font-black text-foreground-subtle">{cardPreview.businessName.slice(0, 1) || "L"}</span>}
              </div>
              <label className="min-w-0 flex-1 text-sm font-bold">{logoPreview ? copy.changeLogo : copy.uploadLogo}<input name="logoFile" type="file" accept={BUSINESS_LOGO_ACCEPT} onChange={(event) => { const file = event.target.files?.[0]; if (!file || file.size > BUSINESS_LOGO_MAX_BYTES || !isBusinessLogoMimeType(file.type)) { if (file) setNotice(copy.logoError); event.target.value = ""; return; } const reader = new FileReader(); reader.onload = () => setLogoPreview(typeof reader.result === "string" ? reader.result : ""); reader.readAsDataURL(file); }} className="mt-2 block w-full rounded-xl border bg-white px-3 py-2" /></label>
            </div>
            <input type="hidden" name="logoUrl" value={String(draft.logoUrl || "")} />
            <StandardCardSetup language={locale === "ar" ? "AR" : "EN"} initial={{ primaryColor: String(draft.primaryColor || "#111827"), secondaryColor: String(draft.secondaryColor || "#FFFFFF"), themePreset: String(draft.themePreset || "DEFAULT"), artworkEnabled: draft.standardCardArtworkEnabled !== false, artworkCategory: String(draft.standardCardArtworkCategory || "OTHER") }} preview={{ ...cardPreview, logoUrl: logoPreview, currency }} />
          </section>

          <section className={sectionClass(3)} data-owner-step-panel="4">
            <h2 className="text-2xl font-bold">{sections[3]}</h2>
            <p className="text-sm text-foreground-muted">{copy.reviewHint}</p>
            <div className="grid gap-3 sm:grid-cols-2" aria-label={labels.summary}>
              <article className="rounded-xl border p-4"><p className="text-xs font-black uppercase tracking-wide text-primary">{labels.business}</p><p className="mt-2 font-bold">{review.businessName}</p><p className="mt-1 text-sm text-foreground-muted">{[review.city, review.country].filter(Boolean).join(", ")}</p><p className="text-sm text-foreground-muted">{review.currency} · {review.timezone}</p></article>
              <article className="rounded-xl border p-4"><p className="text-xs font-black uppercase tracking-wide text-primary">{labels.program}</p><p className="mt-2 font-bold">{review.loyaltyMode}</p><p className="mt-1 text-sm text-foreground-muted">{review.unitName}</p>{review.loyaltyMode === "POINTS" ? <p className="text-sm text-foreground-muted">{labels.pointsEarn}: {review.earnAmount}</p> : <p className="text-sm text-foreground-muted">{review.loyaltyMode === "VISITS" ? labels.fixedVisit : labels.salesEarn}</p>}</article>
              <article className="rounded-xl border p-4"><p className="text-xs font-black uppercase tracking-wide text-primary">{labels.reward}</p><p className="mt-2 font-bold">{review.rewardName}</p><p className="mt-1 text-sm text-foreground-muted">{copy.target}: {review.rewardThreshold} {review.unitName}</p></article>
              <article className="rounded-xl border p-4"><p className="text-xs font-black uppercase tracking-wide text-primary">{labels.card}</p><div className="mt-2 flex items-center gap-3"><span className="size-6 rounded-md border" style={{ backgroundColor: review.primaryColor }} aria-hidden="true" /><p className="font-bold">{logoPreview ? labels.logoReady : labels.logoDefault}</p></div></article>
              <article className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:col-span-2"><p className="text-xs font-black uppercase tracking-wide text-primary">{labels.trial}</p><p className="mt-2 text-lg font-black">{labels.trialValue}</p></article>
            </div>
          </section>

          <div data-testid="owner-mobile-action-bar" className="sticky bottom-0 z-20 -mx-4 grid min-w-0 grid-cols-2 gap-3 border-t border-border/80 bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-12px_30px_rgb(15_23_42/0.08)] backdrop-blur sm:static sm:mx-0 sm:flex sm:items-center sm:justify-between sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none">
            <button type="button" onClick={() => navigateToStep(step - 1)} disabled={!step} className="min-h-12 w-full rounded-xl border px-4 py-3 disabled:opacity-50 sm:w-auto">{copy.back}</button>
            <button type="submit" formAction={async (formData) => { formData.set("contactPhone", normalizeOwnerOnboardingPhone(String(formData.get("contactPhone") || ""), String(formData.get("country") || country))); const result = await saveAction(formData); setNotice(result.saved ? copy.saved : result.error || copy.saveFailed); }} className="min-h-12 w-full rounded-xl border px-3 py-3 sm:ml-auto sm:w-auto sm:px-4">{copy.saveProgress}</button>
            {step === 3 ? <button type="submit" formAction={launchAction} className="col-span-2 min-h-12 w-full rounded-xl bg-primary px-4 py-3 font-semibold text-white sm:col-span-1 sm:w-auto">{copy.launch}</button> : <button type="button" onClick={goNext} data-owner-next-checkpoint="OWNER_NEXT_CLICK" className="col-span-2 min-h-12 w-full rounded-xl bg-primary px-4 py-3 font-semibold text-white sm:col-span-1 sm:w-auto">{copy.next}</button>}
          </div>
        </div>
      </div>
    </form>
  );
}
