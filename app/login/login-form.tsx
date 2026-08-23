"use client";

import {
  ArrowLeft,
  ArrowRight,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Mail,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import type { SupportedLocale } from "@/lib/i18n/config";

import { loginAction, type LoginState } from "./actions";

type LoginCopy = {
  email: string;
  password: string;
  emailPlaceholder: string;
  passwordPlaceholder: string;
  forgotPassword: string;
  signIn: string;
  signingIn: string;
  invalid: string;
  serviceUnavailable: string;
  mfaTitle: string;
  mfaBody: string;
  mfaLabel: string;
  mfaPlaceholder: string;
  verify: string;
  verifying: string;
  back: string;
  setupTitle: string;
  setupBody: string;
  setupCta: string;
  resendVerification: string;
  verificationRequiredTitle: string;
  verificationRequiredBody: string;
  verificationRequiredCta: string;
};

const initialState: LoginState = {};

export function LoginForm({
  locale,
  copy,
  initialError,
}: {
  locale: SupportedLocale;
  copy: LoginCopy;
  initialError: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState,
  );
  const [dismissedSecondaryState, setDismissedSecondaryState] =
    useState<LoginState | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const hasSecondaryStep =
    state.status === "mfa-required" ||
    state.status === "mfa-invalid" ||
    state.status === "mfa-setup-required";
  const showPrimaryStep =
    !hasSecondaryStep || dismissedSecondaryState === state;
  const requiresMfa =
    (state.status === "mfa-required" || state.status === "mfa-invalid") &&
    !showPrimaryStep;
  const needsSetup = state.status === "mfa-setup-required" && !showPrimaryStep;
  const ForwardArrow = locale === "ar" ? ArrowLeft : ArrowRight;
  const BackArrow = locale === "ar" ? ArrowRight : ArrowLeft;

  return (
    <form
      action={formAction}
      className="space-y-5"
      data-login-step={requiresMfa ? "mfa" : "primary"}
    >
      <input
        type="hidden"
        name="loginStep"
        value={requiresMfa ? "mfa" : "primary"}
      />
      {!showPrimaryStep ? (
        <>
          <input type="hidden" name="email" value={email} />
          <input type="hidden" name="password" value={password} />
        </>
      ) : null}

      {(initialError || state.status === "invalid") && showPrimaryStep ? (
        <p
          role="alert"
          className="rounded-2xl border border-danger/20 bg-danger-subtle px-4 py-3 text-sm font-semibold text-danger"
        >
          {copy.invalid}
        </p>
      ) : null}

      {state.status === "service-unavailable" && showPrimaryStep ? (
        <p
          role="alert"
          data-testid="login-service-unavailable"
          className="rounded-2xl border border-warning/25 bg-warning-subtle px-4 py-3 text-sm font-semibold text-foreground"
        >
          {copy.serviceUnavailable}
        </p>
      ) : null}

      {state.status === "verification-required" && showPrimaryStep ? (
        <div
          role="status"
          className="rounded-2xl border border-warning/25 bg-warning-subtle px-4 py-4"
          data-testid="login-verification-required"
        >
          <p className="text-sm font-black text-foreground">
            {copy.verificationRequiredTitle}
          </p>
          <p className="mt-1 text-sm leading-6 text-foreground-muted">
            {copy.verificationRequiredBody}
          </p>
          <Link
            href="/verify-email/resend"
            className="mt-3 inline-flex min-h-10 items-center font-bold text-primary hover:underline"
          >
            {copy.verificationRequiredCta}
          </Link>
        </div>
      ) : null}

      {showPrimaryStep ? (
        <>
          <label
            className="block text-sm font-bold text-foreground"
            htmlFor="email"
          >
            {copy.email}
            <span className="relative mt-2 block">
              <Mail
                size={18}
                aria-hidden="true"
                className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-foreground-subtle"
              />
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                dir="ltr"
                placeholder={copy.emailPlaceholder}
                className="auth-input min-h-12 w-full rounded-xl border border-border bg-white py-3 pe-4 ps-11 text-foreground outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
              />
            </span>
          </label>

          <label
            className="block text-sm font-bold text-foreground"
            htmlFor="password"
          >
            <span className="flex items-center justify-between gap-3">
              <span>{copy.password}</span>
              <Link
                href="/forgot-password"
                className="text-xs font-bold text-primary hover:underline"
              >
                {copy.forgotPassword}
              </Link>
            </span>
            <span className="relative mt-2 block">
              <LockKeyhole
                size={18}
                aria-hidden="true"
                className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-foreground-subtle"
              />
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={10}
                maxLength={200}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                dir="ltr"
                placeholder={copy.passwordPlaceholder}
                className="auth-input min-h-12 w-full rounded-xl border border-border bg-white py-3 pe-4 ps-11 text-foreground outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
              />
            </span>
          </label>

          <button
            type="submit"
            disabled={pending}
            className="group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-white shadow-[0_10px_24px_rgb(79_70_229/0.22)] transition hover:-translate-y-0.5 hover:bg-primary-hover disabled:translate-y-0 disabled:cursor-wait disabled:opacity-65"
          >
            {pending ? (
              <LoaderCircle
                size={18}
                className="animate-spin"
                aria-hidden="true"
              />
            ) : (
              <ForwardArrow size={18} aria-hidden="true" />
            )}
            {pending ? copy.signingIn : copy.signIn}
          </button>
        </>
      ) : null}

      {requiresMfa ? (
        <div className="space-y-5" data-testid="login-mfa-step">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <KeyRound size={22} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-xl font-black text-foreground">
              {copy.mfaTitle}
            </h2>
            <p className="mt-2 text-sm leading-6 text-foreground-muted">
              {copy.mfaBody}
            </p>
          </div>
          {state.status === "mfa-invalid" ? (
            <p
              role="alert"
              className="rounded-2xl border border-danger/20 bg-danger-subtle px-4 py-3 text-sm font-semibold text-danger"
            >
              {copy.invalid}
            </p>
          ) : null}
          <label
            className="block text-sm font-bold text-foreground"
            htmlFor="mfaCode"
          >
            {copy.mfaLabel}
            <input
              id="mfaCode"
              name="mfaCode"
              type="text"
              required
              autoFocus
              autoComplete="one-time-code"
              inputMode="text"
              dir="ltr"
              placeholder={copy.mfaPlaceholder}
              maxLength={64}
              className="auth-input mt-2 min-h-12 w-full rounded-xl border border-border bg-white px-4 py-3 text-center font-mono text-lg tracking-[0.18em] text-foreground outline-none transition focus:border-primary/40 focus:ring-4 focus:ring-primary/10"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-white shadow-[0_10px_24px_rgb(79_70_229/0.22)] transition hover:bg-primary-hover disabled:cursor-wait disabled:opacity-65"
          >
            {pending ? (
              <LoaderCircle
                size={18}
                className="animate-spin"
                aria-hidden="true"
              />
            ) : (
              <KeyRound size={18} aria-hidden="true" />
            )}
            {pending ? copy.verifying : copy.verify}
          </button>
          <button
            type="button"
            onClick={() => setDismissedSecondaryState(state)}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-foreground-muted hover:bg-surface-subtle hover:text-foreground"
          >
            <BackArrow size={16} aria-hidden="true" />
            {copy.back}
          </button>
        </div>
      ) : null}

      {needsSetup ? (
        <div className="space-y-5" data-testid="login-mfa-setup-step">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-warning-subtle text-warning">
            <KeyRound size={22} aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-xl font-black text-foreground">
              {copy.setupTitle}
            </h2>
            <p className="mt-2 text-sm leading-6 text-foreground-muted">
              {copy.setupBody}
            </p>
          </div>
          <Link
            href="/mfa/setup"
            className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-5 py-3 font-bold text-white hover:bg-primary-hover"
          >
            {copy.setupCta}
          </Link>
          <button
            type="button"
            onClick={() => setDismissedSecondaryState(state)}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-foreground-muted hover:bg-surface-subtle hover:text-foreground"
          >
            <BackArrow size={16} aria-hidden="true" />
            {copy.back}
          </button>
        </div>
      ) : null}

      {showPrimaryStep ? (
        <div className="flex justify-center border-t border-border pt-5">
          <Link
            href="/verify-email/resend"
            className="text-xs font-semibold text-foreground-subtle hover:text-primary hover:underline"
          >
            {copy.resendVerification}
          </Link>
        </div>
      ) : null}
    </form>
  );
}
