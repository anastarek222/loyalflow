"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

import { translate } from "@/lib/i18n/catalog";
import type { SupportedLocale } from "@/lib/i18n/config";
import {
  applyTaneeUiTheme,
  getCurrentTaneeUiTheme,
  TANEE_UI_THEME_CHANGE_EVENT,
} from "@/lib/tanee-ui-theme";
import { cn } from "@/lib/utils";

function subscribeToTheme(onStoreChange: () => void) {
  window.addEventListener(TANEE_UI_THEME_CHANGE_EVENT, onStoreChange);
  return () => window.removeEventListener(TANEE_UI_THEME_CHANGE_EVENT, onStoreChange);
}

export function TaneeThemeSwitcher({
  locale,
  className,
}: {
  locale: SupportedLocale;
  className?: string;
}) {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getCurrentTaneeUiTheme,
    () => "light" as const,
  );

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
      onClick={() => applyTaneeUiTheme(theme === "dark" ? "light" : "dark")}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--lf-radius-input)] border border-border bg-surface text-foreground transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lf-focus)]",
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
