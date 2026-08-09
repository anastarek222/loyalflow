"use client";

import { useActionState } from "react";

import { ConfirmSubmitButton } from "@/components/administration/confirm-submit-button";
import { getLogoutEverywhereCopy } from "@/lib/auth/logout-everywhere-copy";
import type { AppLanguage } from "@/lib/i18n";

import {
  logoutEverywhereAction,
  type LogoutEverywhereState,
} from "./actions";

const initialState: LogoutEverywhereState = {};

export function LogoutEverywhereForm({
  language,
}: {
  language: AppLanguage;
}) {
  const [state, formAction, pending] = useActionState(
    logoutEverywhereAction,
    initialState,
  );
  const copy = getLogoutEverywhereCopy(language);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      {state.error ? (
        <p
          role="alert"
          aria-live="polite"
          className="rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-3 text-sm font-semibold text-danger"
        >
          {copy.failed}
        </p>
      ) : null}

      <p className="text-sm leading-6 text-foreground-muted">
        {copy.warning}
      </p>

      <ConfirmSubmitButton
        type="submit"
        confirmation={copy.confirmation}
        disabled={pending}
        aria-busy={pending}
        className="min-h-11 w-full rounded-[var(--lf-radius-input)] bg-danger px-5 py-3 font-bold text-white transition hover:brightness-95 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
      >
        {pending ? copy.submitting : copy.submit}
      </ConfirmSubmitButton>
    </form>
  );
}
