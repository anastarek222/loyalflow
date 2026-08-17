/* eslint-disable @next/next/no-img-element */
"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-policy";
import { getBusinessSetupValidationIssue } from "@/lib/business/setup-validation";
import { CountrySelector } from "@/components/onboarding/country-selector";
import { SUPPORTED_CURRENCY_CODES } from "@/lib/onboarding/countries";
import { StandardCardSetup } from "@/components/standard-card-setup";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
};

function CreateBusinessSubmitButton({ locked }: { locked: boolean }) {
  const { pending } = useFormStatus();
  const submitting = locked || pending;
  return (
    <button
      type="submit"
      disabled={submitting}
      className="ml-auto rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white transition hover:bg-violet-700 disabled:cursor-wait disabled:opacity-70"
    >
      {submitting ? "Creating business…" : "Create Business"}
    </button>
  );
}

const steps = ["Business", "Owner", "Billing", "Loyalty", "Card Design", "Review"] as const;
type SetupStep = 0 | 1 | 2 | 3 | 4;

type ReviewData = {
  name: string;
  contactPhone: string;
  industry: string;
  currency: string;
  timezone: string;
  employeeCount: string;
  email: string;
  country: string;
  city: string;
  website: string;
  taxNumber: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerEmail: string;
  ownerPhone: string;
  billingInterval: string;
  billingCustomDays: string;
  subscriptionStartDate: string;
  nextPaymentDate: string;
  lastPaymentDate: string;
  subscriptionAmount: string;
  billingCurrency: string;
  paymentStatus: string;
  gracePeriodDays: string;
  paymentMethod: string;
  billingNotes: string;
  adminNotes: string;
  plan: string;
  loyaltyMode: string;
  unitName: string;
  rewardName: string;
  rewardThreshold: string;
  earnAmount: string;
  primaryColor: string;
  themePreset: string;
  logoPreview: string;
  standardCardArtworkEnabled: boolean;
  standardCardArtworkCategory: string;
  cardDesignMode: "STANDARD" | "CUSTOM";
};

const loyaltyLabels: Record<string, string> = {
  VISITS: "Visits",
  POINTS: "Points",
  SALES_AMOUNT: "Sales Amount",
};

const themeLabels: Record<string, string> = {
  DEFAULT: "Default",
  MINIMAL: "Minimal",
  LUXURY: "Luxury",
  DARK: "Dark",
  MODERN: "Modern",
  GRADIENT: "Gradient",
};

const billingIntervalLabels: Record<string, string> = {
  FIFTEEN_DAYS: "Every 15 days",
  MONTHLY: "Monthly",
  QUARTERLY: "Every 3 months",
  SEMIANNUAL: "Every 6 months",
  ANNUAL: "Annual",
  CUSTOM: "Custom",
};

const paymentStatusLabels: Record<string, string> = {
  TRIAL: "Trial",
  PAID: "Paid",
  DUE: "Due",
  OVERDUE: "Overdue",
  SUSPENDED: "Suspended",
};

const planLabels: Record<string, string> = {
  FREE: "Free",
  STARTER: "Starter",
  PRO: "Pro",
  BUSINESS: "Business",
};

function getValue(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function getReviewData(formData: FormData, logoPreview: string): ReviewData {
  return {
    name: getValue(formData, "name"),
    contactPhone: getValue(formData, "contactPhone"),
    industry: getValue(formData, "industry"),
    currency: getValue(formData, "currency"),
    timezone: getValue(formData, "timezone"),
    employeeCount: getValue(formData, "employeeCount"),
    email: getValue(formData, "email"),
    country: getValue(formData, "country"),
    city: getValue(formData, "city"),
    website: getValue(formData, "website"),
    taxNumber: getValue(formData, "taxNumber"),
    ownerFirstName: getValue(formData, "ownerFirstName"),
    ownerLastName: getValue(formData, "ownerLastName"),
    ownerEmail: getValue(formData, "ownerEmail"),
    ownerPhone: getValue(formData, "ownerPhone"),
    billingInterval: getValue(formData, "billingInterval"),
    billingCustomDays: getValue(formData, "billingCustomDays"),
    subscriptionStartDate: getValue(formData, "subscriptionStartDate"),
    nextPaymentDate: getValue(formData, "nextPaymentDate"),
    lastPaymentDate: getValue(formData, "lastPaymentDate"),
    subscriptionAmount: getValue(formData, "subscriptionAmount"),
    billingCurrency: getValue(formData, "billingCurrency"),
    paymentStatus: getValue(formData, "paymentStatus"),
    gracePeriodDays: getValue(formData, "gracePeriodDays"),
    paymentMethod: getValue(formData, "paymentMethod"),
    billingNotes: getValue(formData, "billingNotes"),
    adminNotes: getValue(formData, "adminNotes"),
    plan: getValue(formData, "plan"),
    loyaltyMode: getValue(formData, "loyaltyMode"),
    unitName: getValue(formData, "unitName"),
    rewardName: getValue(formData, "rewardName"),
    rewardThreshold: getValue(formData, "rewardThreshold"),
    earnAmount: getValue(formData, "earnAmount"),
    primaryColor: getValue(formData, "primaryColor"),
    themePreset: getValue(formData, "themePreset"),
    logoPreview,
    standardCardArtworkEnabled: formData.get("standardCardArtworkEnabled") === "on",
    standardCardArtworkCategory: getValue(formData, "standardCardArtworkCategory") || "OTHER",
    cardDesignMode: getValue(formData, "cardDesignMode") === "CUSTOM" ? "CUSTOM" : "STANDARD",
  };
}

export default function BusinessSetupWizard({ action }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const submissionLockRef = useRef(false);
  const [submissionStarted, setSubmissionStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [validationError, setValidationError] = useState("");
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [country, setCountry] = useState("Egypt");
  const [currency, setCurrency] = useState("EGP");
  const [timezone, setTimezone] = useState("Africa/Cairo");
  const [timezoneNeedsChoice, setTimezoneNeedsChoice] = useState(false);
  const [dialCode, setDialCode] = useState("+20");
  const [businessPhone, setBusinessPhone] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [cardPreview, setCardPreview] = useState<{
    businessName: string;
    logoUrl: string;
    loyaltyMode: "VISITS" | "POINTS" | "SALES_AMOUNT";
    unitName: string;
    currency: string;
    businessPhone: string;
    businessWebsite: string;
    businessLocation: string;
    rewardName: string;
    rewardThreshold: number;
    primaryColor?: string;
    themePreset?: string;
    artworkEnabled?: boolean;
    artworkCategory?: string;
    designMode?: "STANDARD" | "CUSTOM";
    customDesignEnabled?: boolean;
    customFrontArtworkUrl?: string;
    customBackArtworkUrl?: string;
  }>({
    businessName: "Your Business",
    logoUrl: "",
    loyaltyMode: "VISITS",
    unitName: "Visit",
    currency: "EGP",
    businessPhone: "",
    businessWebsite: "",
    businessLocation: "",
    rewardName: "Free Reward",
    rewardThreshold: 5,
  });

  function fullPhone(local: string) {
    const normalized = local.replace(/[^\d]/g, "").replace(/^0+/, "");
    return normalized ? `${dialCode}${normalized}` : "";
  }

  function focusIssue(field: string) {
    window.setTimeout(
      () => (document.querySelector(`[name="${field}"]`) as HTMLElement | null)?.focus(),
      0,
    );
  }

  function goNext() {
    if (!formRef.current || step > 4) return;
    const formData = new FormData(formRef.current);
    const issue = getBusinessSetupValidationIssue(formData, step as SetupStep);
    if (issue) {
      setValidationError(issue.message);
      setStep(issue.step);
      focusIssue(issue.field);
      return;
    }
    setValidationError("");
    if (step === 4) setReviewData(getReviewData(formData, logoPreview));
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function goBack() {
    setValidationError("");
    setStep((current) => Math.max(current - 1, 0));
  }

  function editStep(nextStep: number) {
    setValidationError("");
    setStep(nextStep);
  }

  return (
    <form
      ref={formRef}
      action={action}
      onInput={(event) => {
        const target = event.target as HTMLInputElement | HTMLSelectElement;
        const key = target.name;
        const previewKey: Record<string, string> = {
          name: "businessName",
          unitName: "unitName",
          rewardName: "rewardName",
          currency: "currency",
          contactPhone: "businessPhone",
          website: "businessWebsite",
        };
        if (previewKey[key]) {
          setCardPreview((current) => ({ ...current, [previewKey[key]]: target.value }));
        }
        if (key === "city" || key === "country") {
          const formData = new FormData(event.currentTarget);
          const location = [getValue(formData, "city"), getValue(formData, "country")]
            .filter(Boolean)
            .join(", ");
          setCardPreview((current) => ({ ...current, businessLocation: location }));
        }
        if (key === "loyaltyMode") {
          setCardPreview((current) => ({
            ...current,
            loyaltyMode: target.value as "VISITS" | "POINTS" | "SALES_AMOUNT",
          }));
        }
        if (key === "rewardThreshold") {
          setCardPreview((current) => ({ ...current, rewardThreshold: Number(target.value) || 1 }));
        }
      }}
      onSubmit={(event) => {
        if (submissionLockRef.current) {
          event.preventDefault();
          return;
        }
        const data = new FormData(event.currentTarget);
        const issue = getBusinessSetupValidationIssue(data);
        if (issue) {
          event.preventDefault();
          setValidationError(issue.message);
          setStep(issue.step);
          focusIssue(issue.field);
          return;
        }
        setValidationError("");
        submissionLockRef.current = true;
        setSubmissionStarted(true);
      }}
      className="mt-6 space-y-5"
    >
      <div className="mb-6">
        <div className="flex items-center justify-between gap-2 overflow-x-auto">
          {steps.map((item, index) => (
            <button
              key={item}
              type="button"
              disabled={index > step}
              onClick={() => {
                if (index < step) editStep(index);
              }}
              className={`whitespace-nowrap text-xs font-bold ${
                index === step
                  ? "text-violet-600"
                  : index < step
                    ? "text-slate-700"
                    : "cursor-default text-slate-400"
              }`}
            >
              {index + 1}. {item}
            </button>
          ))}
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-2 rounded-full bg-violet-600 transition-all"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {validationError ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"
        >
          {validationError}
        </div>
      ) : null}

      <div className={step === 0 ? "block" : "hidden"}>
        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-black">Business Information</h3>
            <p className="mt-1 text-sm text-slate-500">Basic information used to configure the business.</p>
          </div>
          <input name="name" required minLength={2} maxLength={80} placeholder="Business name" className="w-full rounded-xl border px-4 py-3" />
          <input type="hidden" name="contactPhone" value={fullPhone(businessPhone)} />
          <label className="block text-sm font-semibold text-slate-700">
            Business phone <span className="font-normal text-slate-500">(optional)</span>
            <div className="mt-2 flex gap-2">
              <span className="rounded-xl border bg-slate-50 px-3 py-3 text-sm">{dialCode}</span>
              <input
                value={businessPhone}
                onChange={(event) => {
                  const value = event.target.value;
                  setBusinessPhone(value);
                  setCardPreview((current) => ({ ...current, businessPhone: fullPhone(value) }));
                }}
                inputMode="tel"
                placeholder="Local number"
                maxLength={20}
                className="min-w-0 flex-1 rounded-xl border px-4 py-3"
              />
            </div>
          </label>
          <input name="industry" placeholder="Industry" maxLength={100} className="w-full rounded-xl border px-4 py-3" />
          <div className="grid gap-4 sm:grid-cols-2">
            <select name="currency" value={currency} onChange={(event) => setCurrency(event.target.value)} className="w-full rounded-xl border px-4 py-3">
              {SUPPORTED_CURRENCY_CODES.map((code) => <option key={code} value={code}>{code}</option>)}
            </select>
            <input name="timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} placeholder="Timezone" className="w-full rounded-xl border px-4 py-3" />
          </div>
          <input name="employeeCount" type="number" min="0" max="100000" step="1" placeholder="Number of employees" className="w-full rounded-xl border px-4 py-3" />
          <input name="email" type="email" placeholder="Business email" maxLength={255} className="w-full rounded-xl border px-4 py-3" />
          <div className="grid gap-4 sm:grid-cols-2">
            <>
              <input type="hidden" name="country" value={country} />
              <CountrySelector
                value={country}
                required
                onChange={(selection) => {
                  setCountry(selection.name);
                  setDialCode(selection.dialCode);
                  if (selection.currency) setCurrency(selection.currency);
                  setTimezone(selection.timezone);
                  setTimezoneNeedsChoice(selection.timezoneRequiresChoice);
                  setCardPreview((current) => ({
                    ...current,
                    currency: selection.currency || current.currency,
                    businessLocation: [
                      getValue(new FormData(formRef.current!), "city"),
                      selection.name,
                    ].filter(Boolean).join(", "),
                  }));
                }}
              />
            </>
            <input name="city" placeholder="City" maxLength={100} className="w-full rounded-xl border px-4 py-3" />
          </div>
          {timezoneNeedsChoice ? (
            <p className="text-xs font-medium text-amber-700">Choose a timezone for the selected country.</p>
          ) : null}
          <input name="website" type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" placeholder="example.com" maxLength={300} className="w-full rounded-xl border px-4 py-3" />
          <input name="taxNumber" placeholder="Tax number (optional)" maxLength={100} className="w-full rounded-xl border px-4 py-3" />
        </section>
      </div>

      <div className={step === 1 ? "block" : "hidden"}>
        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-black">Owner Account</h3>
            <p className="mt-1 text-sm text-slate-500">This account will become the business owner.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <input name="ownerFirstName" required minLength={2} maxLength={80} placeholder="First name" className="w-full rounded-xl border px-4 py-3" />
            <input name="ownerLastName" maxLength={80} placeholder="Last name" className="w-full rounded-xl border px-4 py-3" />
          </div>
          <input name="ownerEmail" type="email" required maxLength={255} placeholder="Owner email" className="w-full rounded-xl border px-4 py-3" />
          <input type="hidden" name="ownerPhone" value={fullPhone(ownerPhone)} />
          <label className="block text-sm font-semibold text-slate-700">
            Owner phone <span className="font-normal text-slate-500">(optional)</span>
            <div className="mt-2 flex gap-2">
              <span className="rounded-xl border bg-slate-50 px-3 py-3 text-sm">{dialCode}</span>
              <input value={ownerPhone} onChange={(event) => setOwnerPhone(event.target.value)} inputMode="tel" placeholder="Local number" maxLength={20} className="min-w-0 flex-1 rounded-xl border px-4 py-3" />
            </div>
          </label>
          <input name="ownerPassword" type="password" required minLength={MIN_PASSWORD_LENGTH} maxLength={100} autoComplete="new-password" placeholder={`Password — minimum ${MIN_PASSWORD_LENGTH} characters`} className="w-full rounded-xl border px-4 py-3" />
          <p className="text-xs text-slate-500">Minimum {MIN_PASSWORD_LENGTH} characters. The password will never appear in the review step.</p>
        </section>
      </div>

      <div className={step === 2 ? "block" : "hidden"}>
        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-black">Subscription & Billing</h3>
            <p className="mt-1 text-sm text-slate-500">Set the commercial cycle and next payment date for this business.</p>
          </div>
          <label className="block text-sm font-semibold text-slate-700">
            Product plan
            <select name="plan" defaultValue="FREE" className="mt-2 w-full rounded-xl border px-4 py-3">
              <option value="FREE">Free</option><option value="STARTER">Starter</option><option value="PRO">Pro</option><option value="BUSINESS">Business</option>
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              Billing cycle
              <select name="billingInterval" defaultValue="MONTHLY" className="mt-2 w-full rounded-xl border px-4 py-3">
                <option value="FIFTEEN_DAYS">Every 15 days</option><option value="MONTHLY">Monthly</option><option value="QUARTERLY">Every 3 months</option><option value="SEMIANNUAL">Every 6 months</option><option value="ANNUAL">Annual</option><option value="CUSTOM">Custom days</option>
              </select>
            </label>
            <label className="text-sm font-semibold text-slate-700">Custom interval days<input name="billingCustomDays" type="number" min="1" max="730" step="1" placeholder="Only for Custom" className="mt-2 w-full rounded-xl border px-4 py-3" /></label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">Subscription amount<input name="subscriptionAmount" inputMode="decimal" placeholder="1500.00" className="mt-2 w-full rounded-xl border px-4 py-3" /></label>
            <label className="text-sm font-semibold text-slate-700">
              Billing currency
              <select name="billingCurrency" defaultValue="EGP" className="mt-2 w-full rounded-xl border px-4 py-3">
                <option value="EGP">EGP</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option><option value="SAR">SAR</option><option value="AED">AED</option>
              </select>
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="text-sm font-semibold text-slate-700">Subscription start<input name="subscriptionStartDate" type="date" className="mt-2 w-full rounded-xl border px-4 py-3" /></label>
            <label className="text-sm font-semibold text-slate-700">Next payment<input name="nextPaymentDate" type="date" className="mt-2 w-full rounded-xl border px-4 py-3" /></label>
            <label className="text-sm font-semibold text-slate-700">Last payment<input name="lastPaymentDate" type="date" className="mt-2 w-full rounded-xl border px-4 py-3" /></label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              Payment status
              <select name="paymentStatus" defaultValue="TRIAL" className="mt-2 w-full rounded-xl border px-4 py-3">
                <option value="TRIAL">Trial</option><option value="PAID">Paid</option><option value="DUE">Due</option><option value="OVERDUE">Overdue</option><option value="SUSPENDED">Suspended</option>
              </select>
            </label>
            <label className="text-sm font-semibold text-slate-700">Grace period (days)<input name="gracePeriodDays" type="number" min="0" max="60" step="1" defaultValue="3" className="mt-2 w-full rounded-xl border px-4 py-3" /></label>
          </div>
          <input name="paymentMethod" maxLength={80} placeholder="Payment method / channel (optional)" className="w-full rounded-xl border px-4 py-3" />
          <textarea name="billingNotes" maxLength={1000} rows={2} placeholder="Payment notes (optional)" className="w-full rounded-xl border px-4 py-3" />
          <textarea name="adminNotes" maxLength={2000} rows={2} placeholder="Internal admin notes — never shown to the business owner" className="w-full rounded-xl border px-4 py-3" />
        </section>
      </div>

      <div className={step === 3 ? "block" : "hidden"}>
        <section className="space-y-4">
          <div><h3 className="text-lg font-black">Loyalty Setup</h3><p className="mt-1 text-sm text-slate-500">Configure how customers earn and redeem rewards.</p></div>
          <select name="loyaltyMode" defaultValue="VISITS" className="w-full rounded-xl border px-4 py-3"><option value="VISITS">Visits</option><option value="POINTS">Points</option><option value="SALES_AMOUNT">Sales Amount</option></select>
          <input name="unitName" required defaultValue="زيارة" maxLength={30} placeholder="Unit name" className="w-full rounded-xl border px-4 py-3" />
          <input name="rewardName" required minLength={2} maxLength={100} defaultValue="هدية مجانية" placeholder="Reward name" className="w-full rounded-xl border px-4 py-3" />
          <div className="grid gap-4 sm:grid-cols-2">
            <input name="rewardThreshold" type="number" min="1" max="1000000" step="1" required defaultValue="5" placeholder="Reward threshold" className="w-full rounded-xl border px-4 py-3" />
            <input name="earnAmount" type="number" min="1" max="1000000" step="1" required defaultValue="1" placeholder="Earn amount" className="w-full rounded-xl border px-4 py-3" />
          </div>
        </section>
      </div>

      <div className={step === 4 ? "block" : "hidden"}>
        <section className="space-y-5">
          <div><h3 className="text-lg font-black">Card Design</h3><p className="mt-1 text-sm text-slate-500">Configure the one card design used for every customer.</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Business Logo</p>
            <div className="mt-4 flex aspect-square max-w-44 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              {logoPreview ? <img src={logoPreview} alt="Current business logo preview" className="size-full object-contain p-3" /> : <span className="text-5xl font-black text-slate-300">{cardPreview.businessName.trim().slice(0, 1).toUpperCase() || "L"}</span>}
            </div>
            <label htmlFor="logoFile" className="mt-5 block text-sm font-semibold text-slate-700">{logoPreview ? "Change Logo" : "Upload Logo"} <span className="font-normal text-slate-500">(optional)</span></label>
            <input
              id="logoFile"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (file.size > 500 * 1024 || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
                  setValidationError("Logo must be a PNG, JPEG, or WebP image smaller than 500KB.");
                  event.target.value = "";
                  setLogoPreview("");
                  return;
                }
                setValidationError("");
                const reader = new FileReader();
                reader.onload = () => {
                  const preview = typeof reader.result === "string" ? reader.result : "";
                  setLogoPreview(preview);
                  setCardPreview((current) => ({ ...current, logoUrl: preview }));
                };
                reader.readAsDataURL(file);
              }}
              className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:font-semibold file:text-white"
            />
            <input type="hidden" name="logoDataUrl" value={logoPreview.startsWith("data:image/") ? logoPreview : ""} />
            <p className="mt-1 text-xs text-slate-500">PNG, JPEG, or WebP — up to 500KB.</p>
          </div>

          <StandardCardSetup
            language="EN"
            allowCustom
            initial={{ primaryColor: "#B98A4B", themePreset: "DEFAULT", artworkEnabled: true, artworkCategory: "OTHER", designMode: "STANDARD" }}
            preview={{ ...cardPreview, logoUrl: logoPreview }}
            onPreviewChange={(next) => setCardPreview((current) => ({ ...current, ...next }))}
          />

          <input type="hidden" name="logoUrl" value="" />
          <input type="hidden" name="cardStyle" value="CLASSIC" />
          <input type="hidden" name="secondaryColor" value="#FFFFFF" />
          <input type="hidden" name="fontFamily" value="INTER" />
        </section>
      </div>

      <div className={step === 5 ? "block" : "hidden"}>
        <section className="space-y-4">
          <div><h3 className="text-lg font-black">Review & Create</h3><p className="mt-1 text-sm text-slate-500">Review the setup before creating the business.</p></div>
          {reviewData ? (
            <div className="space-y-4">
              <ReviewSection title="Business" onEdit={() => editStep(0)} rows={[
                ["Name", reviewData.name], ["Industry", reviewData.industry], ["Phone", reviewData.contactPhone], ["Email", reviewData.email], ["Location", [reviewData.city, reviewData.country].filter(Boolean).join(", ")], ["Currency", reviewData.currency], ["Timezone", reviewData.timezone], ["Employees", reviewData.employeeCount], ["Website", reviewData.website], ["Tax number", reviewData.taxNumber],
              ]} />
              <ReviewSection title="Owner" onEdit={() => editStep(1)} rows={[
                ["Name", [reviewData.ownerFirstName, reviewData.ownerLastName].filter(Boolean).join(" ")], ["Email", reviewData.ownerEmail], ["Phone", reviewData.ownerPhone], ["Password", "••••••••••"],
              ]} />
              <ReviewSection title="Billing" onEdit={() => editStep(2)} rows={[
                ["Plan", planLabels[reviewData.plan] ?? reviewData.plan], ["Cycle", billingIntervalLabels[reviewData.billingInterval] ?? reviewData.billingInterval], ["Custom days", reviewData.billingCustomDays], ["Amount", reviewData.subscriptionAmount ? `${reviewData.subscriptionAmount} ${reviewData.billingCurrency}` : ""], ["Status", paymentStatusLabels[reviewData.paymentStatus] ?? reviewData.paymentStatus], ["Start date", reviewData.subscriptionStartDate], ["Next payment", reviewData.nextPaymentDate], ["Last payment", reviewData.lastPaymentDate], ["Grace days", reviewData.gracePeriodDays], ["Payment method", reviewData.paymentMethod], ["Payment notes", reviewData.billingNotes], ["Internal notes", reviewData.adminNotes],
              ]} />
              <ReviewSection title="Loyalty" onEdit={() => editStep(3)} rows={[
                ["Mode", loyaltyLabels[reviewData.loyaltyMode] ?? reviewData.loyaltyMode], ["Unit", reviewData.unitName], ["Reward", reviewData.rewardName], ["Threshold", reviewData.rewardThreshold], ["Earn amount", reviewData.earnAmount],
              ]} />
              <ReviewSection title="Card Design" onEdit={() => editStep(4)} rows={[
                ["Theme", themeLabels[reviewData.themePreset] ?? reviewData.themePreset], ["Primary", reviewData.primaryColor], ["Logo", reviewData.logoPreview ? "Configured" : "Not set"], ["Design", reviewData.cardDesignMode === "CUSTOM" ? "Custom Card" : "LoyalFlow Standard Card"], ["Artwork", reviewData.standardCardArtworkEnabled ? reviewData.standardCardArtworkCategory : "Disabled"],
              ]} />
              {reviewData.logoPreview ? (
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <img src={reviewData.logoPreview} alt="Business logo preview" className="h-12 w-12 rounded-lg border border-slate-200 bg-white object-contain p-1" />
                  <span className="text-sm font-medium text-slate-700">Logo preview</span>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Complete the previous steps to generate the review.</p>
          )}
        </section>
      </div>

      <div className="flex items-center justify-between gap-3 pt-2">
        {step > 0 ? (
          <button type="button" onClick={goBack} className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50">Back</button>
        ) : <span />}
        {step < steps.length - 1 ? (
          <button type="button" onClick={goNext} className="ml-auto rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-violet-700">Next</button>
        ) : <CreateBusinessSubmitButton locked={submissionStarted} />}
      </div>
    </form>
  );
}

function ReviewSection({ title, rows, onEdit }: { title: string; rows: Array<[string, string]>; onEdit: () => void }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-4">
        <h4 className="font-black text-slate-950">{title}</h4>
        <button type="button" onClick={onEdit} className="text-sm font-bold text-violet-600 hover:text-violet-800">Edit</button>
      </div>
      <dl className="mt-4 space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-5 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
            <dt className="text-sm text-slate-500">{label}</dt>
            <dd dir="auto" className="max-w-[65%] break-words text-right text-sm font-semibold text-slate-900">{value || "—"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
