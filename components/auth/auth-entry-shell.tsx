import type { ReactNode } from "react";
import Link from "next/link";

import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { PlatformBrandIdentity } from "@/components/platform-brand-identity";
import type { SupportedLocale } from "@/lib/i18n/config";
import { getLocaleDirection } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

type AuthEntryShellProps = {
  locale: SupportedLocale;
  children: ReactNode;
  width?: "md" | "lg";
  className?: string;
};

/**
 * Shared visual shell for authentication entry points.
 *
 * The shell owns identity, locale controls, card width, spacing and semantic
 * surfaces. Route components own only their specific copy/forms/states.
 */
export function AuthEntryShell({
  locale,
  children,
  width = "md",
  className,
}: AuthEntryShellProps) {
  const direction = getLocaleDirection(locale);

  return (
    <main
      lang={locale}
      dir={direction}
      data-auth-entry-shell=""
      className="flex min-h-screen items-center justify-center bg-surface-subtle px-4 py-10 sm:px-6 sm:py-12"
    >
      <section
        className={cn(
          "w-full rounded-[var(--lf-radius-card)] border border-border bg-surface p-6 shadow-[var(--lf-shadow-raised)] sm:p-8",
          width === "lg" ? "max-w-lg" : "max-w-md",
          className,
        )}
      >
        <div className="mb-7 flex min-h-11 items-center justify-between gap-4">
          <Link
            href="/"
            aria-label="Tanee"
            className="inline-flex min-h-11 items-center rounded-[var(--lf-radius-input)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lf-focus)]"
          >
            <PlatformBrandIdentity
              locale={locale}
              fallback="letters"
              showMark={false}
              themeAdaptiveWordmark
              wordmarkClassName="h-7 w-auto max-w-36"
              wordmarkSize="marketing"
              textClassName="text-lg font-black text-foreground"
            />
          </Link>
          <LanguageSwitcher locale={locale} alternateOnly />
        </div>

        {children}
      </section>
    </main>
  );
}
