"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

import { translate } from "@/lib/i18n/catalog";
import type { SupportedLocale } from "@/lib/i18n/config";
import { MARKETING_THEME_STORAGE_KEY } from "@/lib/marketing/theme";
import { cn } from "@/lib/utils";

type MarketingTheme = "light" | "dark";

const THEME_CHANGE_EVENT = "tanee:marketing-theme-change";

function currentTheme(): MarketingTheme {
  return document.documentElement.dataset.marketingTheme === "dark"
    ? "dark"
    : "light";
}

function subscribeToTheme(onStoreChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
}

export function MarketingThemeSwitcher({
  locale,
  className,
}: {
  locale: SupportedLocale;
  className?: string;
}) {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    currentTheme,
    () => "light" as const,
  );

  function toggleTheme() {
    const nextTheme: MarketingTheme =
      currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.marketingTheme = nextTheme;
    window.localStorage.setItem(MARKETING_THEME_STORAGE_KEY, nextTheme);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }

  const label = translate(
    locale,
    theme === "dark" ? "marketing.themeToLight" : "marketing.themeToDark",
  );

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={theme === "dark"}
      onClick={toggleTheme}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-foreground transition-colors hover:border-primary/40 hover:text-primary",
        className,
      )}
    >
      {theme === "dark" ? (
        <Sun size={18} aria-hidden="true" />
      ) : (
        <Moon size={18} aria-hidden="true" />
      )}
    </button>
  );
}
