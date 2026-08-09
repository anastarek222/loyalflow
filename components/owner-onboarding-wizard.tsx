"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useLayoutEffect, useRef, useState } from "react";

import {
  CountrySelector,
  type CountrySelectorHandle,
} from "@/components/onboarding/country-selector";
import { StandardCardSetup } from "@/components/standard-card-setup";
import type { SupportedLocale } from "@/lib/i18n/config";
import { getOwnerOnboardingCopy } from "@/lib/onboarding/owner-onboarding-copy";
import {
  normalizeOwnerOnboardingPhone,
  validateOwnerOnboardingStep,
} from "@/lib/onboarding/owner-onboarding-validation";
import {
  COUNTRY_OPTIONS,
  SUPPORTED_CURRENCY_CODES,
} from "@/lib/onboarding/countries";

type Action = (
  formData: FormData,
) => Promise<{ saved?: boolean; error?: string }>;

function ownerOnboardingDiagnostic(event: string) {
  if (process.env.NODE_ENV === "development") {
    console.debug(event);
  }
}

export function OwnerOnboardingWizard({
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
  const sections = copy.sections;
  const formRef = useRef<HTMLFormElement>(null);
  const setFormElement = useCallback((node: HTMLFormElement | null) => {
    formRef.current = node;
    if (node) node.dataset.ownerHydrated = "true";
  }, []);
  const countrySelectorRef = useRef<CountrySelectorHandle>(null);
  const mobileHeadingRef = useRef<HTMLHeadingElement>(null);
  const stepHeadingRefs = useRef<Array<HTMLHeadingElement | null>>([]);
  const hasMountedRef = useRef(false);
  const [step, setStep] = useState(0);
  const [country, setCountry] = useState(String(draft.country || "Egypt"));
  const [currency, setCurrency] = useState(String(draft.currency || "EGP"));
  const [timezone, setTimezone] = useState(
    String(draft.timezone || "Africa/Cairo"),
  );
  const [phone, setPhone] = useState(String(draft.contactPhone || ""));
  const [notice, setNotice] = useState("");
  const [logoPreview, setLogoPreview] = useState(String(draft.logoUrl || ""));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const sectionClass = (index: number) =>
    step === index ? "space-y-4" : "hidden";
  const selectedCountry = COUNTRY_OPTIONS.find(
    (option) => option.name === country,
  );
  const timezoneOptions = selectedCountry?.timezones?.length
    ? selectedCountry.timezones
    : [timezone];
  const transitionToStep = (nextStep: number) => {
    const boundedStep = Math.max(0, Math.min(sections.length - 1, nextStep));
    countrySelectorRef.current?.close();
    if (boundedStep === 1) {
      ownerOnboardingDiagnostic("OWNER_STEP_CHANGE_2");
    }
    setStep(boundedStep);
  };

  useLayoutEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    if (step === 1) {
      ownerOnboardingDiagnostic("OWNER_STEP_RENDER_2");
    }
    const mobileHeading = mobileHeadingRef.current;
    const target =
      mobileHeading && mobileHeading.offsetParent !== null
        ? mobileHeading
        : stepHeadingRefs.current[step];
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  const goNext = () => {
    ownerOnboardingDiagnostic("OWNER_NEXT_CLICK");
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    const normalizedPhone = normalizeOwnerOnboardingPhone(phone, country);
    formData.set("contactPhone", normalizedPhone);
    setPhone(normalizedPhone);
    const error = validateOwnerOnboardingStep(step, formData, locale);
    if (error) {
      setFieldErrors({ [error.field]: error.message });
      setNotice(`${copy.fixField}: ${error.message}`);
      window.requestAnimationFrame(() => {
        const container = formRef.current?.querySelector<HTMLElement>(
          `[data-onboarding-field="${error.field}"]`,
        );
        const target = container?.matches("input, select, textarea")
          ? container
          : container?.querySelector<HTMLElement>("input, select, textarea");
        target?.focus({ preventScroll: true });
        (container || target)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
      return;
    }
    ownerOnboardingDiagnostic("OWNER_STEP1_VALID");
    setFieldErrors({});
    setNotice("");
    transitionToStep(step + 1);
  };

  return (
    <form
      ref={setFormElement}
      noValidate
      data-owner-step={step + 1}
      data-owner-hydrated="false"
      className="mx-auto min-w-0 max-w-2xl space-y-6 overflow-hidden rounded-2xl border border-border bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-sm sm:p-8"
    >
      <div
        className="sm:hidden"
        data-testid="owner-mobile-step-header"
        data-owner-step={step + 1}
      >
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-foreground-muted">
              {copy.step} {step + 1} {copy.of} {sections.length}
            </p>
            <h1
              ref={mobileHeadingRef}
              tabIndex={-1}
              className="mt-1 scroll-mt-4 text-xl font-black focus:outline-none"
            >
              {sections[step]}
            </h1>
          </div>
          <span className="text-sm font-bold text-foreground-muted">
            {Math.round(((step + 1) / sections.length) * 100)}%
          </span>
        </div>
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-surface-subtle"
          role="progressbar"
          aria-label={copy.progressLabel}
          aria-valuemin={1}
          aria-valuemax={sections.length}
          aria-valuenow={step + 1}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${((step + 1) / sections.length) * 100}%` }}
          />
        </div>
      </div>
      <nav
        aria-label={copy.navLabel}
        className="hidden max-w-full gap-2 overflow-x-auto pb-2 [scrollbar-width:thin] sm:flex"
      >
        {sections.map((section, index) => (
          <button
            type="button"
            key={section}
            onClick={() => transitionToStep(index)}
            aria-current={step === index ? "step" : undefined}
            className={`min-h-10 shrink-0 whitespace-nowrap rounded-lg px-3 text-sm ${step === index ? "bg-primary text-white" : "bg-surface-subtle text-foreground-muted"}`}
          >
            {index + 1}. {section}
          </button>
        ))}
      </nav>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {copy.step} {step + 1} {copy.of} {sections.length}: {sections[step]}
      </p>
      {notice ? (
        <p
          role={Object.keys(fieldErrors).length ? "alert" : "status"}
          className={`rounded-lg p-3 text-sm ${Object.keys(fieldErrors).length ? "border border-danger/30 bg-danger-subtle text-danger" : "bg-success-subtle text-success"}`}
        >
          {notice}
        </p>
      ) : null}
      <input type="hidden" name="currency" value={currency} />
      <input type="hidden" name="timezone" value={timezone} />

      <section className={sectionClass(0)} data-owner-step-panel="1">
        <h1 ref={(node) => { stepHeadingRefs.current[0] = node; }} tabIndex={-1} className="hidden scroll-mt-4 text-2xl font-bold focus:outline-none sm:block">{sections[0]}</h1>
        <label className="block text-sm font-bold">
          {copy.businessName}
          <input data-onboarding-field="name" name="name" aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? "owner-name-error" : undefined} defaultValue={String(draft.name || "")} placeholder={copy.businessName} className="mt-2 min-h-12 w-full rounded-xl border px-4 py-3" />
          {fieldErrors.name ? <p id="owner-name-error" className="mt-1 text-sm font-semibold text-danger">{fieldErrors.name}</p> : null}
        </label>
        <div data-onboarding-field="countrySelector">
          <p className="mb-2 text-sm font-bold">{copy.country}</p>
          <CountrySelector ref={countrySelectorRef} name="country" value={country} onChange={(item) => { setCountry(item.name); if (item.currency) setCurrency(item.currency); setTimezone(item.timezone); setFieldErrors({}); }} />
          {fieldErrors.countrySelector ? <p className="mt-1 text-sm font-semibold text-danger">{fieldErrors.countrySelector}</p> : null}
        </div>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <label className="block text-sm font-bold">{copy.city}<input name="city" defaultValue={String(draft.city || "")} placeholder={copy.city} className="mt-2 min-h-12 w-full min-w-0 rounded-xl border px-4 py-3" /></label>
          <div>
            <label htmlFor="owner-business-phone" className="text-sm font-bold">{copy.businessPhone}</label>
            <input id="owner-business-phone" data-onboarding-field="contactPhone" name="contactPhone" aria-invalid={Boolean(fieldErrors.contactPhone)} value={phone} onChange={(event) => setPhone(event.target.value)} onBlur={() => setPhone(normalizeOwnerOnboardingPhone(phone, country))} inputMode="tel" autoComplete="tel" placeholder="01212312746 or +201212312746" className="mt-2 min-h-12 w-full min-w-0 rounded-xl border px-4 py-3" />
            <p className="mt-1 text-xs text-foreground-muted">{copy.phoneHint}</p>
            {fieldErrors.contactPhone ? <p className="mt-1 text-sm font-semibold text-danger">{fieldErrors.contactPhone}</p> : null}
          </div>
        </div>
        <label className="block text-sm font-bold">{copy.industry}<input name="industry" defaultValue={String(draft.industry || "")} placeholder={copy.industryPlaceholder} className="mt-2 min-h-12 w-full rounded-xl border px-4 py-3" /></label>
        <label className="block text-sm font-bold">{copy.currency}<input data-onboarding-field="currencyInput" value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} list="owner-currency-options" aria-invalid={Boolean(fieldErrors.currencyInput)} autoComplete="off" className="mt-2 min-h-12 w-full rounded-xl border px-4 py-3" /><datalist id="owner-currency-options">{SUPPORTED_CURRENCY_CODES.map((code) => <option key={code} value={code} />)}</datalist>{fieldErrors.currencyInput ? <p className="mt-1 text-sm font-semibold text-danger">{fieldErrors.currencyInput}</p> : null}</label>
        <label className="block text-sm font-bold">{copy.timezone}<input data-onboarding-field="timezoneInput" value={timezone} onChange={(event) => setTimezone(event.target.value)} list="owner-timezone-options" aria-invalid={Boolean(fieldErrors.timezoneInput)} autoComplete="off" className="mt-2 min-h-12 w-full rounded-xl border px-4 py-3" /><datalist id="owner-timezone-options">{timezoneOptions.map((zone) => <option key={zone} value={zone} />)}</datalist>{fieldErrors.timezoneInput ? <p className="mt-1 text-sm font-semibold text-danger">{fieldErrors.timezoneInput}</p> : null}</label>
      </section>

      <section className={sectionClass(1)} data-owner-step-panel="2">
        <h1 ref={(node) => { stepHeadingRefs.current[1] = node; }} tabIndex={-1} className="hidden scroll-mt-4 text-2xl font-bold focus:outline-none sm:block">{sections[1]}</h1>
        <label className="block text-sm font-bold">{copy.loyaltyMode}<select name="loyaltyMode" defaultValue={String(draft.loyaltyMode || "VISITS")} className="mt-2 min-h-12 w-full rounded-xl border px-4 py-3"><option value="VISITS">{copy.visits}</option><option value="POINTS">{copy.points}</option><option value="SALES_AMOUNT">{copy.salesAmount}</option></select></label>
        <label className="block text-sm font-bold">{copy.loyaltyUnit}<input name="unitName" defaultValue={String(draft.unitName || "Visit")} maxLength={30} className="mt-2 min-h-12 w-full rounded-xl border px-4 py-3" /></label>
      </section>

      <section className={sectionClass(2)}>
        <h1 ref={(node) => { stepHeadingRefs.current[2] = node; }} tabIndex={-1} className="hidden scroll-mt-4 text-2xl font-bold focus:outline-none sm:block">{sections[2]}</h1>
        <label className="block text-sm font-bold">{copy.reward}<input name="rewardName" defaultValue={String(draft.rewardName || "Reward")} className="mt-2 min-h-12 w-full rounded-xl border px-4 py-3" /></label>
        <label className="block text-sm font-bold">{copy.target}<input name="rewardThreshold" type="number" min="1" defaultValue={String(draft.rewardThreshold || 5)} className="mt-2 min-h-12 w-full rounded-xl border px-4 py-3" /></label>
        <label className="block text-sm font-bold">{copy.earnAmount}<input name="earnAmount" type="number" min="1" defaultValue={String(draft.earnAmount || 1)} className="mt-2 min-h-12 w-full rounded-xl border px-4 py-3" /></label>
      </section>

      <section className={sectionClass(3)}>
        <h1 ref={(node) => { stepHeadingRefs.current[3] = node; }} tabIndex={-1} className="hidden scroll-mt-4 text-2xl font-bold focus:outline-none sm:block">{sections[3]}</h1>
        <div className="flex items-center gap-4 rounded-xl border bg-surface-subtle p-4">
          <div className="flex size-24 items-center justify-center overflow-hidden rounded-xl border bg-white">{logoPreview ? <img src={logoPreview} alt={copy.identity} className="size-full object-contain p-2" /> : <span className="text-3xl font-black text-foreground-subtle">{String(draft.name || "L").slice(0, 1)}</span>}</div>
          <div className="min-w-0 flex-1"><p className="text-sm font-bold">{copy.identity}</p><p className="mt-1 text-sm text-foreground-muted">{copy.identityHint}</p></div>
        </div>
      </section>

      <section className={sectionClass(4)}>
        <h1 ref={(node) => { stepHeadingRefs.current[4] = node; }} tabIndex={-1} className="hidden scroll-mt-4 text-2xl font-bold focus:outline-none sm:block">{sections[4]}</h1>
        <p className="mt-1 text-sm text-foreground-muted">{copy.cardHint}</p>
        <div className="mt-4 flex items-center gap-4 rounded-xl border bg-surface-subtle p-4">
          <div className="flex size-24 items-center justify-center overflow-hidden rounded-xl border bg-white">{logoPreview ? <img src={logoPreview} alt={copy.identity} className="size-full object-contain p-2" /> : <span className="text-3xl font-black text-foreground-subtle">{String(draft.name || "L").slice(0, 1)}</span>}</div>
          <label className="min-w-0 flex-1 text-sm font-bold">{logoPreview ? copy.changeLogo : copy.uploadLogo}<input name="logoFile" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (!file || file.size > 500 * 1024) { if (file) setNotice(copy.logoError); event.target.value = ""; return; } const reader = new FileReader(); reader.onload = () => setLogoPreview(typeof reader.result === "string" ? reader.result : ""); reader.readAsDataURL(file); }} className="mt-2 block w-full rounded-xl border bg-white px-3 py-2" /></label>
        </div>
        <input type="hidden" name="logoUrl" value={String(draft.logoUrl || "")} />
        <div className="mt-4"><StandardCardSetup initial={{ businessName: String(draft.name || "Your Business"), logoUrl: logoPreview, primaryColor: String(draft.primaryColor || "#111827"), themePreset: String(draft.themePreset || "DEFAULT"), artworkEnabled: draft.standardCardArtworkEnabled !== false, artworkCategory: String(draft.standardCardArtworkCategory || "OTHER"), loyaltyMode: (draft.loyaltyMode as "VISITS" | "POINTS" | "SALES_AMOUNT") || "POINTS", unitName: String(draft.unitName || "Points"), currency, rewardName: String(draft.rewardName || "Free Reward"), rewardThreshold: Number(draft.rewardThreshold || 1000) }} /></div>
      </section>

      <section className={sectionClass(5)}>
        <h1 ref={(node) => { stepHeadingRefs.current[5] = node; }} tabIndex={-1} className="hidden scroll-mt-4 text-2xl font-bold focus:outline-none sm:block">{sections[5]}</h1>
        <p className="mt-2 text-sm text-foreground-muted">{copy.reviewHint}</p>
      </section>

      <div className="grid min-w-0 grid-cols-2 gap-3 sm:flex sm:items-center sm:justify-between">
        <button type="button" onClick={() => transitionToStep(step - 1)} disabled={!step} className="min-h-12 w-full rounded-xl border px-4 py-3 disabled:opacity-50 sm:w-auto">{copy.back}</button>
        <button type="submit" formAction={async (formData) => { const result = await saveAction(formData); setNotice(result.saved ? copy.saved : result.error || copy.saveFailed); }} className="min-h-12 w-full rounded-xl border px-3 py-3 sm:ml-auto sm:w-auto sm:px-4">{copy.saveProgress}</button>
        {step === 5 ? <button type="submit" formAction={launchAction} className="col-span-2 min-h-12 w-full rounded-xl bg-primary px-4 py-3 font-semibold text-white sm:col-span-1 sm:w-auto">{copy.launch}</button> : <button type="button" onClick={goNext} data-owner-next-checkpoint="OWNER_NEXT_CLICK" className="col-span-2 min-h-12 w-full rounded-xl bg-primary px-4 py-3 font-semibold text-white sm:col-span-1 sm:w-auto">{copy.next}</button>}
      </div>
    </form>
  );
}
