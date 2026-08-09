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

export function SuperAdminMfaSetupForm() {
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
            <label htmlFor="email" className="mb-2 block text-sm font-semibold text-foreground-muted">
              Super Admin email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="auth-input min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-3"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-semibold text-foreground-muted">
              Password
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
            <p className="text-sm font-medium text-danger">
              Unable to start MFA enrollment. Check your credentials and try again.
            </p>
          )}
          <button
            type="submit"
            disabled={beginPending}
            className="min-h-11 w-full rounded-[var(--lf-radius-input)] bg-primary px-4 py-3 font-semibold text-white disabled:opacity-60"
          >
            {beginPending ? "Preparing MFA…" : "Start MFA setup"}
          </button>
        </form>
      ) : (
        <div className="space-y-5">
          <div className="rounded-[var(--lf-radius-input)] border border-border bg-surface-subtle p-4">
            <h2 className="font-bold text-foreground">Add LoyalFlow to your authenticator</h2>
            <p className="mt-2 text-sm text-foreground-muted">
              Enter this secret manually in your authenticator app, then use the current 6-digit code below.
            </p>
            <code className="mt-3 block break-all rounded bg-white p-3 text-sm font-bold text-foreground">
              {beginState.secret}
            </code>
            <a
              href={beginState.otpauthUri}
              className="mt-3 inline-block text-sm font-semibold text-primary hover:underline"
            >
              Open authenticator link
            </a>
          </div>

          <div className="rounded-[var(--lf-radius-input)] border border-warning/30 bg-warning-subtle p-4">
            <h2 className="font-bold text-foreground">Save your recovery codes now</h2>
            <p className="mt-2 text-sm text-foreground-muted">
              Each code works once. Store them somewhere secure before confirming setup.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-sm">
              {beginState.recoveryCodes?.map((code) => (
                <code key={code} className="rounded bg-white px-2 py-1">{code}</code>
              ))}
            </div>
          </div>

          <form action={confirmAction} className="space-y-4">
            <input type="hidden" name="enrollmentToken" value={beginState.enrollmentToken} />
            <div>
              <label htmlFor="code" className="mb-2 block text-sm font-semibold text-foreground-muted">
                6-digit authenticator code
              </label>
              <input
                id="code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                className="auth-input min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-3 tracking-[0.3em]"
              />
            </div>
            {confirmState.error && (
              <p className="text-sm font-medium text-danger">
                The code is invalid or the setup window expired. Restart MFA setup.
              </p>
            )}
            <button
              type="submit"
              disabled={confirmPending}
              className="min-h-11 w-full rounded-[var(--lf-radius-input)] bg-primary px-4 py-3 font-semibold text-white disabled:opacity-60"
            >
              {confirmPending ? "Enabling MFA…" : "Enable MFA"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
