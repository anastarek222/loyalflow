import type { AppLanguage } from "@/lib/i18n";
import {
  getPasswordChangeCopy,
  getPasswordChangeErrorMessage,
  type PasswordChangeError,
} from "@/lib/auth/password-change-copy";

const inputClassName =
  "mt-2 min-h-11 w-full rounded-[var(--lf-radius-input)] border border-border bg-white px-4 py-3 text-foreground outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/15";

export function PasswordChangeFormView({
  language,
  error,
  pending,
  formAction,
}: {
  language: AppLanguage;
  error?: PasswordChangeError;
  pending: boolean;
  formAction?: (formData: FormData) => void | Promise<void>;
}) {
  const copy = getPasswordChangeCopy(language);

  return (
    <form action={formAction} className="mt-6 space-y-5">
      {error ? (
        <p
          role="alert"
          aria-live="polite"
          className="rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle px-4 py-3 text-sm font-semibold text-danger"
        >
          {getPasswordChangeErrorMessage(language, error)}
        </p>
      ) : null}

      <div>
        <label
          htmlFor="currentPassword"
          className="block text-sm font-semibold text-foreground-muted"
        >
          {copy.currentPassword}
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          maxLength={128}
          autoComplete="current-password"
          dir="ltr"
          disabled={pending}
          className={inputClassName}
        />
      </div>

      <div>
        <label
          htmlFor="newPassword"
          className="block text-sm font-semibold text-foreground-muted"
        >
          {copy.newPassword}
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={10}
          maxLength={100}
          autoComplete="new-password"
          dir="ltr"
          disabled={pending}
          aria-describedby="new-password-help"
          className={inputClassName}
        />
        <p
          id="new-password-help"
          className="mt-2 text-xs text-foreground-subtle"
        >
          {copy.passwordHelp}
        </p>
      </div>

      <div>
        <label
          htmlFor="confirmNewPassword"
          className="block text-sm font-semibold text-foreground-muted"
        >
          {copy.confirmNewPassword}
        </label>
        <input
          id="confirmNewPassword"
          name="confirmNewPassword"
          type="password"
          required
          minLength={10}
          maxLength={100}
          autoComplete="new-password"
          dir="ltr"
          disabled={pending}
          className={inputClassName}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="min-h-11 w-full rounded-[var(--lf-radius-input)] bg-primary px-5 py-3 font-bold text-white transition hover:bg-primary-hover disabled:cursor-wait disabled:opacity-60 sm:w-auto"
      >
        {pending ? copy.submitting : copy.submit}
      </button>
    </form>
  );
}
