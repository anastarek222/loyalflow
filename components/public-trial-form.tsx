"use client";

import type { PublicTrialFormState } from "@/app/get-started/actions";
import { CountrySelector } from "@/components/onboarding/country-selector";
import Link from "next/link";
import { useActionState, useState } from "react";

type Props = {
  locale: "ar" | "en";
  action: (
    previousState: PublicTrialFormState,
    formData: FormData,
  ) => Promise<PublicTrialFormState>;
};

const fieldClass =
  "min-h-12 w-full rounded-[var(--lf-radius-input)] border border-border bg-surface px-4 py-3 text-foreground outline-none placeholder:text-foreground-subtle focus:border-primary/40 focus:ring-4 focus:ring-primary/10";

export function PublicTrialForm({ locale, action }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [country, setCountry] = useState("");
  const isArabic = locale === "ar";
  const copy = isArabic
    ? {
        firstName: "الاسم الأول",
        lastName: "اسم العائلة (اختياري)",
        email: "بريد العمل",
        phone: "رقم الهاتف",
        phoneHelp: "يمكنك كتابة الرقم المحلي بعد اختيار الدولة.",
        businessName: "اسم النشاط",
        termsStart: "أوافق على",
        terms: "الشروط",
        and: "و",
        privacy: "سياسة الخصوصية",
        submit: "ابدأ الفترة التجريبية",
        submitting: "جارٍ إرسال رابط الإعداد...",
        validation: "راجع البيانات المطلوبة وحاول مرة أخرى.",
        limited: "طلبات كثيرة خلال وقت قصير. حاول مرة أخرى لاحقًا.",
        unavailable: "تعذر إرسال رابط الإعداد الآن. حاول مرة أخرى لاحقًا.",
        successTitle: "راجع بريدك الإلكتروني",
        successBody:
          "إذا كانت البيانات مؤهلة، ستصلك رسالة من تاني تحتوي على رابط آمن لتعيين كلمة المرور. لا نكشف هنا إذا كان الحساب موجودًا أو استُخدمت الفترة التجريبية من قبل.",
      }
    : {
        firstName: "First name",
        lastName: "Last name (optional)",
        email: "Work email",
        phone: "Phone number",
        phoneHelp: "You may enter a local number after choosing your country.",
        businessName: "Business name",
        termsStart: "I agree to the",
        terms: "Terms",
        and: "and",
        privacy: "Privacy Policy",
        submit: "Start free trial",
        submitting: "Sending your secure setup link...",
        validation: "Review the required details and try again.",
        limited: "Too many requests in a short time. Please try again later.",
        unavailable:
          "We could not send the setup link right now. Please try again later.",
        successTitle: "Check your email",
        successBody:
          "If the details are eligible, Tanee will send a secure password-setup link. This page does not reveal whether an account already exists or a trial was used before.",
      };

  if (state.status === "submitted") {
    return (
      <div
        role="status"
        data-public-trial-state="submitted"
        className="rounded-[var(--lf-radius-card)] border border-success/30 bg-success-subtle p-6 text-success"
      >
        <h3 className="text-lg font-black">{copy.successTitle}</h3>
        <p className="mt-2 text-sm leading-7">{copy.successBody}</p>
      </div>
    );
  }

  const error =
    state.status === "validation-error"
      ? copy.validation
      : state.status === "rate-limited"
        ? copy.limited
        : state.status === "service-unavailable"
          ? copy.unavailable
          : null;

  return (
    <form action={formAction} className="grid gap-4" data-public-trial-form="true">
      {error ? (
        <div
          role="alert"
          data-public-trial-state={state.status}
          className="rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-3 text-sm font-semibold text-danger"
        >
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-semibold text-foreground">
          {copy.firstName}
          <input
            name="firstName"
            required
            minLength={2}
            maxLength={80}
            autoComplete="given-name"
            className={fieldClass}
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-foreground">
          {copy.lastName}
          <input
            name="lastName"
            maxLength={80}
            autoComplete="family-name"
            className={fieldClass}
          />
        </label>
      </div>

      <label className="grid gap-2 text-sm font-semibold text-foreground">
        {copy.businessName}
        <input
          name="businessName"
          required
          minLength={2}
          maxLength={120}
          autoComplete="organization"
          className={fieldClass}
        />
      </label>

      <label className="grid gap-2 text-sm font-semibold text-foreground">
        {copy.email}
        <input
          name="email"
          type="email"
          required
          maxLength={255}
          autoComplete="email"
          inputMode="email"
          dir="ltr"
          className={fieldClass}
        />
      </label>

      <div className="grid gap-2 text-sm font-semibold text-foreground">
        <span>{isArabic ? "الدولة" : "Country"}</span>
        <CountrySelector
          name="country"
          value={country}
          required
          language={isArabic ? "AR" : "EN"}
          onChange={(selected) => setCountry(selected.name)}
        />
      </div>

      <label className="grid gap-2 text-sm font-semibold text-foreground">
        {copy.phone}
        <input
          name="phone"
          type="tel"
          required
          minLength={8}
          maxLength={25}
          autoComplete="tel"
          inputMode="tel"
          dir="ltr"
          className={fieldClass}
        />
        <span className="text-xs font-normal text-foreground-subtle">
          {copy.phoneHelp}
        </span>
      </label>

      <label className="sr-only" aria-hidden="true">
        Company website
        <input
          name="companyWebsite"
          tabIndex={-1}
          autoComplete="off"
        />
      </label>

      <label className="flex items-start gap-3 text-sm leading-6 text-foreground-muted">
        <input
          name="acceptTerms"
          type="checkbox"
          required
          className="mt-1 size-4 shrink-0 accent-primary"
        />
        <span>
          {copy.termsStart}{" "}
          <Link href="/terms" className="font-semibold text-primary hover:underline">
            {copy.terms}
          </Link>{" "}
          {copy.and}{" "}
          <Link href="/privacy" className="font-semibold text-primary hover:underline">
            {copy.privacy}
          </Link>
          .
        </span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-12 items-center justify-center rounded-[var(--lf-radius-input)] bg-primary px-5 py-3 font-bold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? copy.submitting : copy.submit}
      </button>
    </form>
  );
}
