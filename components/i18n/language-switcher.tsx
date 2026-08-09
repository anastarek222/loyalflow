"use client";

import { useRouter } from "next/navigation";

import { translate } from "@/lib/i18n/catalog";
import type { SupportedLocale } from "@/lib/i18n/config";
import { LOCALE_COOKIE_NAME } from "@/lib/i18n/request";

type LanguageSwitcherProps = {
  locale: SupportedLocale;
};

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function LanguageSwitcher({ locale }: LanguageSwitcherProps) {
  const router = useRouter();

  function setLocale(nextLocale: SupportedLocale) {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${LOCALE_COOKIE_NAME}=${nextLocale}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax${secure}`;
    router.refresh();
  }

  return (
    <div
      aria-label={translate(locale, "common.language")}
      className="flex items-center justify-center gap-2 text-xs"
    >
      <button
        type="button"
        aria-pressed={locale === "en"}
        onClick={() => setLocale("en")}
        className="rounded-[var(--lf-radius-input)] border border-border px-3 py-2 font-semibold text-foreground-muted hover:bg-surface-subtle"
      >
        {translate(locale, "common.english")}
      </button>
      <button
        type="button"
        aria-pressed={locale === "ar"}
        onClick={() => setLocale("ar")}
        className="rounded-[var(--lf-radius-input)] border border-border px-3 py-2 font-semibold text-foreground-muted hover:bg-surface-subtle"
      >
        {translate(locale, "common.arabic")}
      </button>
    </div>
  );
}
