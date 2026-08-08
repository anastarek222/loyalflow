"use client";

import { useActionState } from "react";

import type { AppLanguage } from "@/lib/i18n";

import {
  changePasswordAction,
  type ChangePasswordState,
} from "./actions";
import { PasswordChangeFormView } from "./password-change-form-view";

const initialState: ChangePasswordState = {};

export function ChangePasswordForm({
  language,
}: {
  language: AppLanguage;
}) {
  const [state, formAction, pending] = useActionState(
    changePasswordAction,
    initialState,
  );

  return (
    <PasswordChangeFormView
      language={language}
      error={state.error}
      pending={pending}
      formAction={formAction}
    />
  );
}
