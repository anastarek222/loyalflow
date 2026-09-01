"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { PlatformBrandIdentity } from "@/components/platform-brand-identity";
import { translate } from "@/lib/i18n/catalog";
import type { SupportedLocale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

type MarketingHeaderProps = {
  locale: SupportedLocale;
  brand: string;
  signIn: string;
  primaryCta: string;
  menuLabel: string;
  closeLabel: string;
  navigation: ReadonlyArray<{ href: string; label: string }>;
};

export function MarketingHeader({
  locale,
  brand,
  signIn,
  primaryCta,
  menuLabel,
  closeLabel,
  navigation,
}: MarketingHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const updateHeader = () => setIsScrolled(window.scrollY > 12);
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    return () => window.removeEventListener("scroll", updateHeader);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const items = Array.from(
        drawerRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      if (!items.length) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [isOpen]);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-[background-color,border-color,box-shadow] duration-200",
        isScrolled
          ? "border-border bg-white shadow-[var(--lf-shadow-raised)]"
          : "border-border/70 bg-[var(--lf-marketing-canvas)]",
      )}
    >
      <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group inline-flex min-h-11 items-center gap-2.5 rounded-xl font-black tracking-tight text-foreground"
        >
          <PlatformBrandIdentity
            locale={locale}
            fallback="sparkles"
            fallbackText={brand}
            markClassName="flex size-9 items-center justify-center rounded-xl bg-primary text-[18px] text-white"
            markImageClassName="p-1"
            wordmarkClassName="h-7 w-auto max-w-40"
            textClassName="text-lg sm:text-xl"
          />
        </Link>

        <nav
          aria-label={translate(locale, "marketing.primaryNavLabel")}
          className="hidden items-center gap-1 lg:flex"
        >
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-foreground-muted transition-colors hover:bg-[var(--lf-primary-soft)] hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <LanguageSwitcher locale={locale} />
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-foreground transition-colors hover:bg-white"
          >
            {signIn}
          </Link>
          <Link
            href="/get-started"
            className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-bold text-white transition-colors duration-150 hover:bg-primary-hover"
          >
            {primaryCta}
          </Link>
        </div>

        <button
          ref={menuButtonRef}
          type="button"
          aria-label={isOpen ? closeLabel : menuLabel}
          aria-expanded={isOpen}
          aria-controls="marketing-mobile-menu"
          onClick={() => setIsOpen((open) => !open)}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-white text-foreground lg:hidden"
        >
          {isOpen ? (
            <X size={20} aria-hidden="true" />
          ) : (
            <Menu size={20} aria-hidden="true" />
          )}
        </button>
      </div>

      {isOpen
        ? createPortal(
            <>
              <button
                type="button"
                aria-label={closeLabel}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 z-[80] cursor-default bg-foreground/55 lg:hidden"
              />
              <aside
                ref={drawerRef}
                id="marketing-mobile-menu"
                role="dialog"
                aria-modal="true"
                aria-label={translate(locale, "marketing.mobileNavLabel")}
                className="fixed inset-y-0 end-0 z-[90] flex h-[100dvh] w-80 max-w-[calc(100vw-1rem)] flex-col overflow-hidden border-s border-border bg-white shadow-[var(--lf-shadow-overlay)] [overflow-wrap:anywhere] lg:hidden"
              >
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                  <Link
                    href="/"
                    onClick={() => setIsOpen(false)}
                    className="inline-flex min-h-11 items-center gap-2 font-black"
                  >
                    <PlatformBrandIdentity
                      locale={locale}
                      fallback="sparkles"
                      fallbackText={brand}
                      markClassName="flex size-9 items-center justify-center rounded-xl bg-primary text-[18px] text-white"
                      markImageClassName="p-1"
                      wordmarkClassName="h-7 w-auto max-w-32"
                    />
                  </Link>
                  <button
                    ref={closeButtonRef}
                    type="button"
                    aria-label={closeLabel}
                    onClick={() => setIsOpen(false)}
                    className="flex size-11 items-center justify-center rounded-xl border border-border bg-white text-foreground"
                  >
                    <X size={20} aria-hidden="true" />
                  </button>
                </div>
                <nav
                  aria-label={translate(locale, "marketing.mobileNavLabel")}
                  className="min-h-0 flex-1 overscroll-contain overflow-y-auto px-3 py-4"
                >
                  {navigation.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className="flex min-h-12 items-center rounded-xl px-3 font-semibold leading-6 text-foreground-muted hover:bg-surface-subtle hover:text-foreground"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
                <div className="grid gap-3 border-t border-border bg-surface-subtle p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                  <LanguageSwitcher locale={locale} />
                  <Link
                    href="/login"
                    onClick={() => setIsOpen(false)}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-white px-4 text-sm font-semibold text-foreground"
                  >
                    {signIn}
                  </Link>
                  <Link
                    href="/get-started"
                    onClick={() => setIsOpen(false)}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-white"
                  >
                    {primaryCta}
                  </Link>
                </div>
              </aside>
            </>,
            document.body,
          )
        : null}
    </header>
  );
}
