/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { BusinessLogoImage } from "@/components/business-logo-image";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-policy";
import {
  BUSINESS_LOGO_ACCEPT,
  BUSINESS_LOGO_MAX_BYTES,
  isBusinessLogoMimeType,
} from "@/lib/branding/image-policy";
import { getBusinessSetupValidationIssue } from "@/lib/business/setup-validation";
import { CountrySelector } from "@/components/onboarding/country-selector";
import { SUPPORTED_CURRENCY_CODES } from "@/lib/onboarding/countries";
import { StandardCardSetup } from "@/components/standard-card-setup";
import { STANDARD_CARD_UNIT_LABEL_MAX_LENGTH } from "@/lib/cards/standard-card-text";

type Language = "AR" | "EN";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  language: Language;
};

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
  secondaryColor: string;
  themePreset: string;
  logoPreview: string;
  standardCardArtworkEnabled: boolean;
  standardCardArtworkCategory: string;
  cardDesignMode: "STANDARD" | "CUSTOM";
};

const labels = {
  EN: {
    loyalty: {
      VISITS: "Visits",
      POINTS: "Points",
      SALES_AMOUNT: "Sales Amount",
    },
    theme: {
      DEFAULT: "Default",
      MINIMAL: "Minimal",
      LUXURY: "Luxury",
      DARK: "Dark",
      MODERN: "Modern",
      GRADIENT: "Gradient",
    },
    billing: {
      FIFTEEN_DAYS: "Every 15 days",
      MONTHLY: "Monthly",
      QUARTERLY: "Every 3 months",
      SEMIANNUAL: "Every 6 months",
      ANNUAL: "Annual",
      CUSTOM: "Custom",
    },
    payment: {
      TRIAL: "Trial",
      PAID: "Paid",
      DUE: "Due",
      OVERDUE: "Overdue",
      SUSPENDED: "Suspended",
    },
    plan: {
      FREE: "Free",
      STARTER: "Starter",
      PRO: "Pro",
      BUSINESS: "Business",
    },
  },
  AR: {
    loyalty: {
      VISITS: "الزيارات",
      POINTS: "النقاط",
      SALES_AMOUNT: "قيمة المبيعات",
    },
    theme: {
      DEFAULT: "افتراضي",
      MINIMAL: "بسيط",
      LUXURY: "فاخر",
      DARK: "داكن",
      MODERN: "حديث",
      GRADIENT: "متدرج",
    },
    billing: {
      FIFTEEN_DAYS: "كل 15 يومًا",
      MONTHLY: "شهري",
      QUARTERLY: "كل 3 أشهر",
      SEMIANNUAL: "كل 6 أشهر",
      ANNUAL: "سنوي",
      CUSTOM: "مدة مخصصة",
    },
    payment: {
      TRIAL: "تجريبي",
      PAID: "مدفوع",
      DUE: "مستحق",
      OVERDUE: "متأخر",
      SUSPENDED: "موقوف",
    },
    plan: {
      FREE: "مجاني",
      STARTER: "Starter",
      PRO: "Pro",
      BUSINESS: "Business",
    },
  },
} as const;

function getCopy(language: Language) {
  return language === "AR"
    ? {
        steps: ["النشاط", "المالك", "الفوترة", "الولاء", "تصميم البطاقة", "المراجعة"],
        creating: "جارٍ إنشاء النشاط…",
        create: "إنشاء النشاط",
        validation: "راجع البيانات المطلوبة في هذه الخطوة ثم حاول مرة أخرى.",
        businessTitle: "بيانات النشاط",
        businessDescription: "البيانات الأساسية المستخدمة في إعداد النشاط.",
        businessName: "اسم النشاط",
        businessPhone: "هاتف النشاط",
        optional: "اختياري",
        localNumber: "الرقم المحلي",
        industry: "المجال",
        timezone: "المنطقة الزمنية",
        employees: "عدد الموظفين",
        businessEmail: "بريد النشاط الإلكتروني",
        city: "المدينة",
        chooseTimezone: "اختر منطقة زمنية للدولة المحددة.",
        taxNumber: "الرقم الضريبي (اختياري)",
        ownerTitle: "حساب المالك",
        ownerDescription: "سيصبح هذا الحساب مالك النشاط.",
        firstName: "الاسم الأول",
        lastName: "اسم العائلة",
        ownerEmail: "بريد المالك الإلكتروني",
        ownerPhone: "هاتف المالك",
        password: `كلمة المرور — ${MIN_PASSWORD_LENGTH} أحرف على الأقل`,
        passwordHint: `الحد الأدنى ${MIN_PASSWORD_LENGTH} أحرف. لن تظهر كلمة المرور في خطوة المراجعة.`,
        billingTitle: "الاشتراك والفوترة",
        billingDescription: "حدد الدورة التجارية وموعد الدفع التالي لهذا النشاط.",
        productPlan: "الخطة",
        billingCycle: "دورة الفوترة",
        customDays: "عدد أيام المدة المخصصة",
        customOnly: "للمدة المخصصة فقط",
        subscriptionAmount: "قيمة الاشتراك",
        billingCurrency: "عملة الفوترة",
        subscriptionStart: "بداية الاشتراك",
        nextPayment: "الدفع التالي",
        lastPayment: "آخر دفعة",
        paymentStatus: "حالة الدفع",
        graceDays: "فترة السماح (بالأيام)",
        paymentMethod: "طريقة / قناة الدفع (اختياري)",
        paymentNotes: "ملاحظات الدفع (اختياري)",
        adminNotes: "ملاحظات إدارية داخلية — لا تظهر لمالك النشاط",
        loyaltyTitle: "إعداد الولاء",
        loyaltyDescription: "حدد كيف يكسب العملاء الرصيد ويستبدلون المكافآت.",
        unitName: "اسم الوحدة",
        rewardName: "اسم المكافأة",
        rewardThreshold: "حد المكافأة",
        earnAmount: "قيمة الكسب",
        cardTitle: "تصميم البطاقة",
        cardDescription: "اضبط تصميم البطاقة المستخدم لكل العملاء.",
        businessLogo: "شعار النشاط",
        logoAlt: "معاينة شعار النشاط الحالي",
        changeLogo: "تغيير الشعار",
        uploadLogo: "رفع الشعار",
        logoError: "يجب أن يكون الشعار PNG أو JPEG أو WebP وأقل من 500KB.",
        logoHint: "PNG أو JPEG أو WebP — بحد أقصى 500KB.",
        reviewTitle: "المراجعة والإنشاء",
        reviewDescription: "راجع الإعداد قبل إنشاء النشاط.",
        business: "النشاط",
        owner: "المالك",
        billing: "الفوترة",
        loyalty: "الولاء",
        cardDesign: "تصميم البطاقة",
        name: "الاسم",
        phone: "الهاتف",
        email: "البريد الإلكتروني",
        location: "الموقع",
        currency: "العملة",
        employeesLabel: "الموظفون",
        website: "الموقع الإلكتروني",
        tax: "الرقم الضريبي",
        passwordLabel: "كلمة المرور",
        plan: "الخطة",
        cycle: "الدورة",
        customDaysLabel: "الأيام المخصصة",
        amount: "القيمة",
        status: "الحالة",
        startDate: "تاريخ البداية",
        nextPaymentLabel: "الدفع التالي",
        lastPaymentLabel: "آخر دفعة",
        grace: "أيام السماح",
        paymentMethodLabel: "طريقة الدفع",
        paymentNotesLabel: "ملاحظات الدفع",
        internalNotes: "الملاحظات الداخلية",
        mode: "النظام",
        unit: "الوحدة",
        reward: "المكافأة",
        threshold: "الحد",
        earn: "قيمة الكسب",
        theme: "السمة",
        primary: "اللون الأساسي",
        secondary: "اللون الثانوي",
        logo: "الشعار",
        configured: "مضبوط",
        notSet: "غير مضبوط",
        design: "التصميم",
        customCard: "بطاقة مخصصة",
        standardCard: "بطاقة LoyalFlow القياسية",
        artwork: "الرسومات",
        disabled: "معطلة",
        logoPreview: "معاينة الشعار",
        completePrevious: "أكمل الخطوات السابقة لإنشاء ملخص المراجعة.",
        back: "السابق",
        next: "التالي",
        edit: "تعديل",
        defaultBusiness: "نشاطك التجاري",
        defaultUnit: "زيارة",
        defaultReward: "هدية مجانية",
      }
    : {
        steps: ["Business", "Owner", "Billing", "Loyalty", "Card Design", "Review"],
        creating: "Creating business…",
        create: "Create business",
        validation: "Please review the required information in this step and try again.",
        businessTitle: "Business information",
        businessDescription: "Basic information used to configure the business.",
        businessName: "Business name",
        businessPhone: "Business phone",
        optional: "optional",
        localNumber: "Local number",
        industry: "Industry",
        timezone: "Timezone",
        employees: "Number of employees",
        businessEmail: "Business email",
        city: "City",
        chooseTimezone: "Choose a timezone for the selected country.",
        taxNumber: "Tax number (optional)",
        ownerTitle: "Owner account",
        ownerDescription: "This account will become the business owner.",
        firstName: "First name",
        lastName: "Last name",
        ownerEmail: "Owner email",
        ownerPhone: "Owner phone",
        password: `Password — minimum ${MIN_PASSWORD_LENGTH} characters`,
        passwordHint: `Minimum ${MIN_PASSWORD_LENGTH} characters. The password will never appear in the review step.`,
        billingTitle: "Subscription & billing",
        billingDescription: "Set the commercial cycle and next payment date for this business.",
        productPlan: "Product plan",
        billingCycle: "Billing cycle",
        customDays: "Custom interval days",
        customOnly: "Only for Custom",
        subscriptionAmount: "Subscription amount",
        billingCurrency: "Billing currency",
        subscriptionStart: "Subscription start",
        nextPayment: "Next payment",
        lastPayment: "Last payment",
        paymentStatus: "Payment status",
        graceDays: "Grace period (days)",
        paymentMethod: "Payment method / channel (optional)",
        paymentNotes: "Payment notes (optional)",
        adminNotes: "Internal admin notes — never shown to the business owner",
        loyaltyTitle: "Loyalty setup",
        loyaltyDescription: "Configure how customers earn and redeem rewards.",
        unitName: "Unit name",
        rewardName: "Reward name",
        rewardThreshold: "Reward threshold",
        earnAmount: "Earn amount",
        cardTitle: "Card design",
        cardDescription: "Configure the one card design used for every customer.",
        businessLogo: "Business logo",
        logoAlt: "Current business logo preview",
        changeLogo: "Change logo",
        uploadLogo: "Upload logo",
        logoError: "Logo must be a PNG, JPEG, or WebP image smaller than 500KB.",
        logoHint: "PNG, JPEG, or WebP — up to 500KB.",
        reviewTitle: "Review & create",
        reviewDescription: "Review the setup before creating the business.",
        business: "Business",
        owner: "Owner",
        billing: "Billing",
        loyalty: "Loyalty",
        cardDesign: "Card design",
        name: "Name",
        phone: "Phone",
        email: "Email",
        location: "Location",
        currency: "Currency",
        employeesLabel: "Employees",
        website: "Website",
        tax: "Tax number",
        passwordLabel: "Password",
        plan: "Plan",
        cycle: "Cycle",
        customDaysLabel: "Custom days",
        amount: "Amount",
        status: "Status",
        startDate: "Start date",
        nextPaymentLabel: "Next payment",
        lastPaymentLabel: "Last payment",
        grace: "Grace days",
        paymentMethodLabel: "Payment method",
        paymentNotesLabel: "Payment notes",
        internalNotes: "Internal notes",
        mode: "Mode",
        unit: "Unit",
        reward: "Reward",
        threshold: "Threshold",
        earn: "Earn amount",
        theme: "Theme",
        primary: "Primary",
        secondary: "Secondary",
        logo: "Logo",
        configured: "Configured",
        notSet: "Not set",
        design: "Design",
        customCard: "Custom card",
        standardCard: "LoyalFlow standard card",
        artwork: "Artwork",
        disabled: "Disabled",
        logoPreview: "Logo preview",
        completePrevious: "Complete the previous steps to generate the review.",
        back: "Back",
        next: "Next",
        edit: "Edit",
        defaultBusiness: "Your Business",
        defaultUnit: "Visit",
        defaultReward: "Free Reward",
      };
}

function CreateBusinessSubmitButton({
  locked,
  language,
}: {
  locked: boolean;
  language: Language;
}) {
  const { pending } = useFormStatus();
  const submitting = locked || pending;
  const copy = getCopy(language);

  return (
    <button
      type="submit"
      disabled={submitting}
      className="min-h-12 w-full rounded-[var(--lf-radius-md)] bg-primary px-5 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-wait disabled:opacity-70 sm:ms-auto sm:w-auto"
    >
      {submitting ? copy.creating : copy.create}
    </button>
  );
}

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
    secondaryColor: getValue(formData, "secondaryColor"),
    themePreset: getValue(formData, "themePreset"),
    logoPreview,
    standardCardArtworkEnabled:
      formData.get("standardCardArtworkEnabled") === "on",
    standardCardArtworkCategory:
      getValue(formData, "standardCardArtworkCategory") || "OTHER",
    cardDesignMode:
      getValue(formData, "cardDesignMode") === "CUSTOM" ? "CUSTOM" : "STANDARD",
  };
}

export default function BusinessSetupWizard({ action, language }: Props) {
  const copy = getCopy(language);
  const localizedLabels = labels[language];
  const formRef = useRef<HTMLFormElement>(null);
  const stepButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
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
    secondaryColor?: string;
    themePreset?: string;
    artworkEnabled?: boolean;
    artworkCategory?: string;
    designMode?: "STANDARD" | "CUSTOM";
    customDesignEnabled?: boolean;
    customFrontArtworkUrl?: string;
    customBackArtworkUrl?: string;
  }>({
    businessName: copy.defaultBusiness,
    logoUrl: "",
    loyaltyMode: "VISITS",
    unitName: copy.defaultUnit,
    currency: "EGP",
    businessPhone: "",
    businessWebsite: "",
    businessLocation: "",
    rewardName: copy.defaultReward,
    rewardThreshold: 5,
  });

  useEffect(() => {
    stepButtonRefs.current[step]?.scrollIntoView({
      block: "nearest",
      inline: "center",
    });
  }, [step]);

  function fullPhone(local: string) {
    const normalized = local.replace(/[^\d]/g, "").replace(/^0+/, "");
    return normalized ? `${dialCode}${normalized}` : "";
  }

  function focusIssue(field: string) {
    window.setTimeout(
      () =>
        (document.querySelector(`[name="${field}"]`) as HTMLElement | null)?.focus(),
      0,
    );
  }

  function setIssue(message: string, field: string, issueStep: SetupStep) {
    setValidationError(language === "AR" ? copy.validation : message);
    setStep(issueStep);
    focusIssue(field);
  }

  function goNext() {
    if (!formRef.current || step > 4) return;
    const formData = new FormData(formRef.current);
    const issue = getBusinessSetupValidationIssue(formData, step as SetupStep);
    if (issue) {
      setIssue(issue.message, issue.field, issue.step);
      return;
    }
    setValidationError("");
    if (step === 4) setReviewData(getReviewData(formData, logoPreview));
    setStep((current) => Math.min(current + 1, copy.steps.length - 1));
  }

  function goBack() {
    setValidationError("");
    setStep((current) => Math.max(current - 1, 0));
  }

  function editStep(nextStep: number) {
    setValidationError("");
    setStep(nextStep);
  }

  const fieldClass =
    "w-full rounded-[var(--lf-radius-md)] border border-border bg-surface px-4 py-3 text-foreground outline-none transition focus:border-primary/30 focus:ring-2 focus:ring-primary/20";
  const labelClass = "block text-sm font-semibold text-foreground-muted";

  return (
    <form
      ref={formRef}
      action={action}
      data-business-setup-language={language}
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
          setCardPreview((current) => ({
            ...current,
            [previewKey[key]]: target.value,
          }));
        }
        if (key === "city" || key === "country") {
          const formData = new FormData(event.currentTarget);
          const location = [
            getValue(formData, "city"),
            getValue(formData, "country"),
          ]
            .filter(Boolean)
            .join(", ");
          setCardPreview((current) => ({
            ...current,
            businessLocation: location,
          }));
        }
        if (key === "loyaltyMode") {
          setCardPreview((current) => ({
            ...current,
            loyaltyMode: target.value as "VISITS" | "POINTS" | "SALES_AMOUNT",
          }));
        }
        if (key === "rewardThreshold") {
          setCardPreview((current) => ({
            ...current,
            rewardThreshold: Number(target.value) || 1,
          }));
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
          setIssue(issue.message, issue.field, issue.step);
          return;
        }
        setValidationError("");
        submissionLockRef.current = true;
        setSubmissionStarted(true);
      }}
      className="mt-6 space-y-5 pb-24 sm:pb-0"
    >
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between gap-3 sm:hidden">
          <p className="text-sm font-black text-primary">{copy.steps[step]}</p>
          <span className="lf-type-numeric shrink-0 text-xs font-bold text-foreground-muted">
            {step + 1}/{copy.steps.length}
          </span>
        </div>
        <div className="flex scroll-px-4 items-center gap-5 overflow-x-auto pb-2 sm:justify-between sm:gap-2 sm:pb-0">
          {copy.steps.map((item, index) => (
            <button
              key={item}
              ref={(element) => {
                stepButtonRefs.current[index] = element;
              }}
              type="button"
              disabled={index > step}
              aria-current={index === step ? "step" : undefined}
              onClick={() => {
                if (index < step) editStep(index);
              }}
              className={`shrink-0 scroll-mx-4 whitespace-nowrap text-xs font-bold ${
                index === step
                  ? "text-primary"
                  : index < step
                    ? "text-foreground-muted"
                    : "cursor-default text-foreground-subtle"
              }`}
            >
              {index + 1}. {item}
            </button>
          ))}
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-subtle">
          <div
            className="h-2 rounded-full bg-primary transition-all"
            style={{ width: `${((step + 1) / copy.steps.length) * 100}%` }}
          />
        </div>
      </div>

      {validationError ? (
        <div
          role="alert"
          className="rounded-[var(--lf-radius-md)] border border-danger/30 bg-danger-subtle px-4 py-3 text-sm font-semibold text-danger"
        >
          {validationError}
        </div>
      ) : null}

      <div className={step === 0 ? "block" : "hidden"}>
        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-black text-foreground">
              {copy.businessTitle}
            </h3>
            <p className="mt-1 text-sm text-foreground-subtle">
              {copy.businessDescription}
            </p>
          </div>
          <input
            name="name"
            required
            minLength={2}
            maxLength={80}
            placeholder={copy.businessName}
            className={fieldClass}
          />
          <input type="hidden" name="contactPhone" value={fullPhone(businessPhone)} />
          <label className={labelClass}>
            {copy.businessPhone}{" "}
            <span className="font-normal text-foreground-subtle">
              ({copy.optional})
            </span>
            <div className="mt-2 flex gap-2">
              <span className="rounded-[var(--lf-radius-md)] border border-border bg-surface-subtle px-3 py-3 text-sm">
                {dialCode}
              </span>
              <input
                value={businessPhone}
                onChange={(event) => {
                  const value = event.target.value;
                  setBusinessPhone(value);
                  setCardPreview((current) => ({
                    ...current,
                    businessPhone: fullPhone(value),
                  }));
                }}
                inputMode="tel"
                placeholder={copy.localNumber}
                maxLength={20}
                className={`min-w-0 flex-1 ${fieldClass}`}
              />
            </div>
          </label>
          <input
            name="industry"
            placeholder={copy.industry}
            maxLength={100}
            className={fieldClass}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <select
              name="currency"
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              className={fieldClass}
              aria-label={copy.currency}
            >
              {SUPPORTED_CURRENCY_CODES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
            <input
              name="timezone"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              placeholder={copy.timezone}
              className={fieldClass}
            />
          </div>
          <input
            name="employeeCount"
            type="number"
            min="0"
            max="100000"
            step="1"
            placeholder={copy.employees}
            className={fieldClass}
          />
          <input
            name="email"
            type="email"
            placeholder={copy.businessEmail}
            maxLength={255}
            className={fieldClass}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <>
              <input type="hidden" name="country" value={country} />
              <CountrySelector
                value={country}
                required
                language={language}
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
                    ]
                      .filter(Boolean)
                      .join(", "),
                  }));
                }}
              />
            </>
            <input
              name="city"
              placeholder={copy.city}
              maxLength={100}
              className={fieldClass}
            />
          </div>
          {timezoneNeedsChoice ? (
            <p className="text-xs font-medium text-warning">
              {copy.chooseTimezone}
            </p>
          ) : null}
          <input
            name="website"
            type="text"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="example.com"
            maxLength={300}
            className={fieldClass}
          />
          <input
            name="taxNumber"
            placeholder={copy.taxNumber}
            maxLength={100}
            className={fieldClass}
          />
        </section>
      </div>

      <div className={step === 1 ? "block" : "hidden"}>
        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-black text-foreground">{copy.ownerTitle}</h3>
            <p className="mt-1 text-sm text-foreground-subtle">
              {copy.ownerDescription}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              name="ownerFirstName"
              required
              minLength={2}
              maxLength={80}
              placeholder={copy.firstName}
              className={fieldClass}
            />
            <input
              name="ownerLastName"
              maxLength={80}
              placeholder={copy.lastName}
              className={fieldClass}
            />
          </div>
          <input
            name="ownerEmail"
            type="email"
            required
            maxLength={255}
            placeholder={copy.ownerEmail}
            className={fieldClass}
          />
          <input type="hidden" name="ownerPhone" value={fullPhone(ownerPhone)} />
          <label className={labelClass}>
            {copy.ownerPhone}{" "}
            <span className="font-normal text-foreground-subtle">
              ({copy.optional})
            </span>
            <div className="mt-2 flex gap-2">
              <span className="rounded-[var(--lf-radius-md)] border border-border bg-surface-subtle px-3 py-3 text-sm">
                {dialCode}
              </span>
              <input
                value={ownerPhone}
                onChange={(event) => setOwnerPhone(event.target.value)}
                inputMode="tel"
                placeholder={copy.localNumber}
                maxLength={20}
                className={`min-w-0 flex-1 ${fieldClass}`}
              />
            </div>
          </label>
          <input
            name="ownerPassword"
            type="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            maxLength={100}
            autoComplete="new-password"
            placeholder={copy.password}
            className={fieldClass}
          />
          <p className="text-xs text-foreground-subtle">{copy.passwordHint}</p>
        </section>
      </div>

      <div className={step === 2 ? "block" : "hidden"}>
        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-black text-foreground">{copy.billingTitle}</h3>
            <p className="mt-1 text-sm text-foreground-subtle">
              {copy.billingDescription}
            </p>
          </div>
          <label className={labelClass}>
            {copy.productPlan}
            <select name="plan" defaultValue="FREE" className={`mt-2 ${fieldClass}`}>
              {Object.entries(localizedLabels.plan).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              {copy.billingCycle}
              <select
                name="billingInterval"
                defaultValue="MONTHLY"
                className={`mt-2 ${fieldClass}`}
              >
                {Object.entries(localizedLabels.billing).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              {copy.customDays}
              <input
                name="billingCustomDays"
                type="number"
                min="1"
                max="730"
                step="1"
                placeholder={copy.customOnly}
                className={`mt-2 ${fieldClass}`}
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              {copy.subscriptionAmount}
              <input
                name="subscriptionAmount"
                inputMode="decimal"
                placeholder="1500.00"
                className={`mt-2 ${fieldClass}`}
              />
            </label>
            <label className={labelClass}>
              {copy.billingCurrency}
              <select
                name="billingCurrency"
                defaultValue="EGP"
                className={`mt-2 ${fieldClass}`}
              >
                {["EGP", "USD", "EUR", "GBP", "SAR", "AED"].map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className={labelClass}>
              {copy.subscriptionStart}
              <input
                name="subscriptionStartDate"
                type="date"
                className={`mt-2 ${fieldClass}`}
              />
            </label>
            <label className={labelClass}>
              {copy.nextPayment}
              <input
                name="nextPaymentDate"
                type="date"
                className={`mt-2 ${fieldClass}`}
              />
            </label>
            <label className={labelClass}>
              {copy.lastPayment}
              <input
                name="lastPaymentDate"
                type="date"
                className={`mt-2 ${fieldClass}`}
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              {copy.paymentStatus}
              <select
                name="paymentStatus"
                defaultValue="TRIAL"
                className={`mt-2 ${fieldClass}`}
              >
                {Object.entries(localizedLabels.payment).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              {copy.graceDays}
              <input
                name="gracePeriodDays"
                type="number"
                min="0"
                max="60"
                step="1"
                defaultValue="3"
                className={`mt-2 ${fieldClass}`}
              />
            </label>
          </div>
          <input
            name="paymentMethod"
            maxLength={80}
            placeholder={copy.paymentMethod}
            className={fieldClass}
          />
          <textarea
            name="billingNotes"
            maxLength={1000}
            rows={2}
            placeholder={copy.paymentNotes}
            className={fieldClass}
          />
          <textarea
            name="adminNotes"
            maxLength={2000}
            rows={2}
            placeholder={copy.adminNotes}
            className={fieldClass}
          />
        </section>
      </div>

      <div className={step === 3 ? "block" : "hidden"}>
        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-black text-foreground">{copy.loyaltyTitle}</h3>
            <p className="mt-1 text-sm text-foreground-subtle">
              {copy.loyaltyDescription}
            </p>
          </div>
          <select
            name="loyaltyMode"
            defaultValue="VISITS"
            className={fieldClass}
            aria-label={copy.mode}
          >
            {Object.entries(localizedLabels.loyalty).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            name="unitName"
            required
            defaultValue={copy.defaultUnit}
            maxLength={STANDARD_CARD_UNIT_LABEL_MAX_LENGTH}
            placeholder={copy.unitName}
            className={fieldClass}
          />
          <input
            name="rewardName"
            required
            minLength={2}
            maxLength={100}
            defaultValue={copy.defaultReward}
            placeholder={copy.rewardName}
            className={fieldClass}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <input
              name="rewardThreshold"
              type="number"
              min="1"
              max="1000000"
              step="1"
              required
              defaultValue="5"
              placeholder={copy.rewardThreshold}
              className={fieldClass}
            />
            <input
              name="earnAmount"
              type="number"
              min="1"
              max="1000000"
              step="1"
              required
              defaultValue="1"
              placeholder={copy.earnAmount}
              className={fieldClass}
            />
          </div>
        </section>
      </div>

      <div className={step === 4 ? "block" : "hidden"}>
        <section className="space-y-5">
          <div>
            <h3 className="text-lg font-black text-foreground">{copy.cardTitle}</h3>
            <p className="mt-1 text-sm text-foreground-subtle">
              {copy.cardDescription}
            </p>
          </div>
          <div
            data-testid="business-logo-upload"
            className="rounded-[var(--lf-radius-lg)] border border-border bg-surface p-4 sm:p-5"
          >
            <div className="flex items-start gap-4">
              <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-[var(--lf-radius-md)] border border-border bg-surface-subtle sm:size-24">
                {logoPreview ? (
                  <BusinessLogoImage
                    src={logoPreview}
                    alt={copy.logoAlt}
                  />
                ) : (
                  <span className="text-3xl font-black text-foreground-subtle">
                    {cardPreview.businessName.trim().slice(0, 1).toUpperCase() || "L"}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-foreground-subtle">
                  {copy.businessLogo}
                </p>
                <label htmlFor="logoFile" className={`mt-2 ${labelClass}`}>
                  {logoPreview ? copy.changeLogo : copy.uploadLogo}{" "}
                  <span className="font-normal text-foreground-subtle">
                    ({copy.optional})
                  </span>
                </label>
                <input
                  id="logoFile"
                  type="file"
                  accept={BUSINESS_LOGO_ACCEPT}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    if (
                      file.size > BUSINESS_LOGO_MAX_BYTES ||
                      !isBusinessLogoMimeType(file.type)
                    ) {
                      setValidationError(copy.logoError);
                      event.target.value = "";
                      setLogoPreview("");
                      return;
                    }
                    setValidationError("");
                    const reader = new FileReader();
                    reader.onload = () => {
                      const preview =
                        typeof reader.result === "string" ? reader.result : "";
                      setLogoPreview(preview);
                      setCardPreview((current) => ({ ...current, logoUrl: preview }));
                    };
                    reader.readAsDataURL(file);
                  }}
                  className="mt-2 w-full min-w-0 rounded-[var(--lf-radius-md)] border border-border bg-surface px-3 py-2 text-sm text-foreground file:me-3 file:rounded-[var(--lf-radius-sm)] file:border-0 file:bg-foreground file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[var(--lf-inverse)]"
                />
                <p className="mt-1 text-xs text-foreground-subtle">{copy.logoHint}</p>
              </div>
            </div>
            <input
              type="hidden"
              name="logoDataUrl"
              value={logoPreview.startsWith("data:image/") ? logoPreview : ""}
            />
          </div>

          <StandardCardSetup
            language={language}
            allowCustom
            initial={{
              primaryColor: "#B98A4B",
              secondaryColor: "#FFFFFF",
              themePreset: "DEFAULT",
              artworkEnabled: true,
              artworkCategory: "OTHER",
              designMode: "STANDARD",
            }}
            preview={{ ...cardPreview, logoUrl: logoPreview }}
            onPreviewChange={(next) =>
              setCardPreview((current) => ({ ...current, ...next }))
            }
          />

          <input type="hidden" name="logoUrl" value="" />
          <input type="hidden" name="cardStyle" value="CLASSIC" />
          <input type="hidden" name="fontFamily" value="INTER" />
        </section>
      </div>

      <div className={step === 5 ? "block" : "hidden"}>
        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-black text-foreground">{copy.reviewTitle}</h3>
            <p className="mt-1 text-sm text-foreground-subtle">
              {copy.reviewDescription}
            </p>
          </div>
          {reviewData ? (
            <div className="space-y-4">
              <ReviewSection
                title={copy.business}
                editLabel={copy.edit}
                onEdit={() => editStep(0)}
                rows={[
                  [copy.name, reviewData.name],
                  [copy.industry, reviewData.industry],
                  [copy.phone, reviewData.contactPhone],
                  [copy.email, reviewData.email],
                  [copy.location, [reviewData.city, reviewData.country].filter(Boolean).join(", ")],
                  [copy.currency, reviewData.currency],
                  [copy.timezone, reviewData.timezone],
                  [copy.employeesLabel, reviewData.employeeCount],
                  [copy.website, reviewData.website],
                  [copy.tax, reviewData.taxNumber],
                ]}
              />
              <ReviewSection
                title={copy.owner}
                editLabel={copy.edit}
                onEdit={() => editStep(1)}
                rows={[
                  [copy.name, [reviewData.ownerFirstName, reviewData.ownerLastName].filter(Boolean).join(" ")],
                  [copy.email, reviewData.ownerEmail],
                  [copy.phone, reviewData.ownerPhone],
                  [copy.passwordLabel, "••••••••••"],
                ]}
              />
              <ReviewSection
                title={copy.billing}
                editLabel={copy.edit}
                onEdit={() => editStep(2)}
                rows={[
                  [copy.plan, localizedLabels.plan[reviewData.plan as keyof typeof localizedLabels.plan] ?? reviewData.plan],
                  [copy.cycle, localizedLabels.billing[reviewData.billingInterval as keyof typeof localizedLabels.billing] ?? reviewData.billingInterval],
                  [copy.customDaysLabel, reviewData.billingCustomDays],
                  [copy.amount, reviewData.subscriptionAmount ? `${reviewData.subscriptionAmount} ${reviewData.billingCurrency}` : ""],
                  [copy.status, localizedLabels.payment[reviewData.paymentStatus as keyof typeof localizedLabels.payment] ?? reviewData.paymentStatus],
                  [copy.startDate, reviewData.subscriptionStartDate],
                  [copy.nextPaymentLabel, reviewData.nextPaymentDate],
                  [copy.lastPaymentLabel, reviewData.lastPaymentDate],
                  [copy.grace, reviewData.gracePeriodDays],
                  [copy.paymentMethodLabel, reviewData.paymentMethod],
                  [copy.paymentNotesLabel, reviewData.billingNotes],
                  [copy.internalNotes, reviewData.adminNotes],
                ]}
              />
              <ReviewSection
                title={copy.loyalty}
                editLabel={copy.edit}
                onEdit={() => editStep(3)}
                rows={[
                  [copy.mode, localizedLabels.loyalty[reviewData.loyaltyMode as keyof typeof localizedLabels.loyalty] ?? reviewData.loyaltyMode],
                  [copy.unit, reviewData.unitName],
                  [copy.reward, reviewData.rewardName],
                  [copy.threshold, reviewData.rewardThreshold],
                  [copy.earn, reviewData.earnAmount],
                ]}
              />
              <ReviewSection
                title={copy.cardDesign}
                editLabel={copy.edit}
                onEdit={() => editStep(4)}
                rows={[
                  [copy.theme, localizedLabels.theme[reviewData.themePreset as keyof typeof localizedLabels.theme] ?? reviewData.themePreset],
                  [copy.primary, reviewData.primaryColor],
                  [copy.secondary, reviewData.secondaryColor],
                  [copy.logo, reviewData.logoPreview ? copy.configured : copy.notSet],
                  [copy.design, reviewData.cardDesignMode === "CUSTOM" ? copy.customCard : copy.standardCard],
                  [copy.artwork, reviewData.standardCardArtworkEnabled ? reviewData.standardCardArtworkCategory : copy.disabled],
                ]}
              />
              {reviewData.logoPreview ? (
                <div className="flex items-center gap-3 rounded-[var(--lf-radius-md)] border border-border bg-surface-subtle p-3">
                  <img
                    src={reviewData.logoPreview}
                    alt={copy.logoPreview}
                    className="h-12 w-12 rounded-[var(--lf-radius-sm)] border border-border bg-surface object-contain p-1"
                  />
                  <span className="text-sm font-medium text-foreground-muted">
                    {copy.logoPreview}
                  </span>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="rounded-[var(--lf-radius-md)] bg-surface-subtle p-4 text-sm text-foreground-subtle">
              {copy.completePrevious}
            </p>
          )}
        </section>
      </div>

      <div
        data-testid="business-setup-mobile-action-bar"
        className="sticky bottom-0 z-20 -mx-5 grid grid-cols-2 items-center gap-3 border-t border-border/80 bg-surface/95 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-12px_30px_rgb(15_23_42/0.08)] backdrop-blur sm:static sm:mx-0 sm:flex sm:justify-between sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none"
      >
        {step > 0 ? (
          <button
            type="button"
            onClick={goBack}
            className="min-h-12 w-full rounded-[var(--lf-radius-md)] border border-border bg-surface px-5 py-3 font-semibold text-foreground-muted transition-colors hover:bg-surface-subtle sm:w-auto"
          >
            {copy.back}
          </button>
        ) : (
          <span className="hidden sm:block" />
        )}
        {step < copy.steps.length - 1 ? (
          <button
            type="button"
            onClick={goNext}
            className={`${step === 0 ? "col-span-2" : ""} min-h-12 w-full rounded-[var(--lf-radius-md)] bg-foreground px-5 py-3 font-semibold text-[var(--lf-inverse)] transition-colors hover:bg-primary sm:col-span-1 sm:ms-auto sm:w-auto`}
          >
            {copy.next}
          </button>
        ) : (
          <CreateBusinessSubmitButton
            locked={submissionStarted}
            language={language}
          />
        )}
      </div>
    </form>
  );
}

function ReviewSection({
  title,
  rows,
  onEdit,
  editLabel,
}: {
  title: string;
  rows: Array<[string, string]>;
  onEdit: () => void;
  editLabel: string;
}) {
  return (
    <section className="rounded-[var(--lf-radius-lg)] border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-4">
        <h4 className="font-black text-foreground">{title}</h4>
        <button
          type="button"
          onClick={onEdit}
          className="text-sm font-bold text-primary hover:text-primary-hover"
        >
          {editLabel}
        </button>
      </div>
      <dl className="mt-4 space-y-2">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-start justify-between gap-5 border-b border-border pb-2 last:border-0 last:pb-0"
          >
            <dt className="text-sm text-foreground-subtle">{label}</dt>
            <dd
              dir="auto"
              className="max-w-[65%] break-words text-end text-sm font-semibold text-foreground"
            >
              {value || "—"}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}