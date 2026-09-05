"use client";

import { useActionState } from "react";

import {
  beginMfaEnrollmentAction,
  confirmMfaEnrollmentAction,
  type BeginMfaState,
  type ConfirmMfaState,
} from "./actions";

const initialBeginState: BeginMfaState = {};
const initialConfirmState: ConfirmMfaState = {};

type MfaSetupCopy = {
  email: string;
  password: string;
  startError: string;
  preparing: string;
  start: string;
  addAuthenticator: string;
  addAuthenticatorBody: string;
  openAuthenticator: string;
  recoveryTitle: string;
  recoveryBody: string;
  sixDigitCode: string;
  confirmError: string;
  enabling: string;
  enable: string;
};

export function SuperAdminMfaSetupForm({ copy }: { copy: MfaSetupCopy }) {
  const [beginState, beginAction, beginPending] = useActionState(
    beginMfaEnrollmentAction,
    initialBeginState,
  );
  const [confirmState, confirmAction, confirmPending] = useActionState(
    confirmMfaEnrollmentAction,
    initialConfirmState,
  );

  const readyToConfirm = Boolean(
    beginState.enrollmentToken && beginState.secret && beginState.recoveryCodes,
  );

  return (
    <div className="space-y-6">
      {!readyToConfirm ? (
        <form action={beginAction} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-semibold text-foreground-muted"
            >
              {copy.email}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              dir="ltr"
              className="auth-input min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-3"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-semibold text-foreground-muted"
            >
              {copy.password}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={10}
              autoComplete="current-password"
              className="auth-input min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-3"
            />
          </div>
          {beginState.error && (
            <p className="text-sm font-medium text-danger">{copy.startError}</p>
          )}
          <button
            type="submit"
            disabled={beginPending}
            className="min-h-11 w-full rounded-[var(--lf-radius-input)] bg-primary px-4 py-3 font-semibold text-white disabled:opacity-60"
          >
            {beginPending ? copy.preparing : copy.start}
          </button>
        </form>
      ) : (
        <div className="space-y-5">
          <div className="rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle p-4">
            <h2 className="font-bold text-foreground">{copy.addAuthenticator}</h2>
            <p className="mt-2 text-sm text-foreground-muted">
              {copy.addAuthenticatorBody}
            </p>
            <code
              className="mt-3 block break-all rounded bg-white p-3 text-sm font-bold text-foreground"
              dir="ltr"
            >
              {beginState.secret}
            </code>
            <a
              href={beginState.otpauthUri}
              className="mt-3 inline-block text-sm font-semibold text-primary hover:underline"
            >
              {copy.openAuthenticator}
            </a>
          </div>

          <div className="rounded-[var(--lf-radius-input)] border border-warning/30 bg-warning-subtle p-4">
            <h2 className="font-bold text-foreground">{copy.recoveryTitle}</h2>
            <p className="mt-2 text-sm text-foreground-muted">
              {copy.recoveryBody}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm" dir="ltr">
              {beginState.recoveryCodes?.map((code) => (
                <code key={code} className="rounded bg-white px-2 py-1">
                  {code}
                </code>
              ))}
            </div>
          </div>

          <form action={confirmAction} className="space-y-4">
            <input
              type="hidden"
              name="enrollmentToken"
              value={beginState.enrollmentToken}
            />
            <div>
              <label
                htmlFor="code"
                className="mb-2 block text-sm font-semibold text-foreground-muted"
              >
                {copy.sixDigitCode}
              </label>
              <input
                id="code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                dir="ltr"
                className="auth-input min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-3 tracking-[0.3em]"
              />
            </div>
            {confirmState.error && (
              <p className="text-sm font-medium text-danger">{copy.confirmError}</p>
            )}
            <button
              type="submit"
              disabled={confirmPending}
              className="min-h-11 w-full rounded-[var(--lf-radius-input)] bg-primary px-4 py-3 font-semibold text-white disabled:opacity-60"
            >
              {confirmPending ? copy.enabling : copy.enable}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
