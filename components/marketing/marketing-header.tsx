"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { MarketingBrandText } from "@/components/marketing/marketing-brand-text";
import { MarketingNavLink } from "@/components/marketing/marketing-nav-link";
import { MarketingThemeSwitcher } from "@/components/marketing/marketing-theme-switcher";
import { PlatformBrandIdentity } from "@/components/platform-brand-identity";
import { translate } from "@/lib/i18n/catalog";
import type { SupportedLocale } from "@/lib/i18n/config";
import { MARKETING_THEME_BOOTSTRAP } from "@/lib/marketing/theme";
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
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const lastScrollYRef = useRef(0);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;
    const updateHeader = () => {
      const currentY = window.scrollY;
      const previousY = lastScrollYRef.current;
      const isMobileHeader = window.matchMedia("(max-width: 1365px)").matches;
      setIsScrolled(currentY > 12);
      if (!isMobileHeader || currentY <= 24 || isOpen) {
        setIsHeaderVisible(true);
      } else if (currentY > previousY + 4) {
        setIsHeaderVisible(false);
      } else if (currentY < previousY - 2) {
        setIsHeaderVisible(true);
      }
      lastScrollYRef.current = currentY;
    };
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    return () => window.removeEventListener("scroll", updateHeader);
  }, [isOpen]);

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

  const contentDirection = locale === "ar" ? "rtl" : "ltr";

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: MARKETING_THEME_BOOTSTRAP }} />
      <header
        dir="ltr"
        data-testid="marketing-header"
        data-header-visible={isHeaderVisible ? "true" : "false"}
        className={cn(
          "lf-marketing-surface fixed inset-x-0 top-0 z-40 border-b transition-[transform,background-color,border-color,box-shadow] duration-200 min-[1366px]:translate-y-0",
          isHeaderVisible ? "translate-y-0" : "-translate-y-full",
          isScrolled
            ? "border-[var(--lf-border)] bg-[var(--lf-surface)] shadow-[var(--lf-shadow-raised)]"
            : "border-[var(--lf-border)]/70 bg-[var(--lf-marketing-canvas)]",
        )}
      >
        <div className="mx-auto flex min-h-[72px] w-full max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
          <Link href="/" className="inline-flex min-h-11 items-center rounded-xl">
            <PlatformBrandIdentity
              locale={locale}
              showMark={false}
              themeAdaptiveWordmark
              fallbackText={brand}
              wordmarkClassName="h-7 w-auto max-w-40"
              wordmarkSize="marketing"
              textClassName="text-lg sm:text-xl"
            />
          </Link>

          <nav
            aria-label={translate(locale, "marketing.primaryNavLabel")}
            className="hidden min-w-0 items-center gap-0 min-[1366px]:flex"
          >
            {navigation.map((item) => (
              <MarketingNavLink
                key={item.href}
                href={item.href}
                className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-xl px-2.5 text-sm font-semibold text-[var(--lf-foreground-muted)] transition-colors hover:bg-[var(--lf-primary-soft)] hover:text-[var(--lf-foreground)]"
                activeClassName="bg-[var(--lf-primary-soft)] text-[var(--lf-foreground)]"
              >
                <span dir={contentDirection}>
                  <MarketingBrandText text={item.label} />
                </span>
              </MarketingNavLink>
            ))}
          </nav>

          <div className="hidden shrink-0 items-center gap-2 min-[1366px]:flex">
            <MarketingThemeSwitcher locale={locale} />
            <LanguageSwitcher locale={locale} alternateOnly />
            <Link
              href="/login"
              dir={contentDirection}
              className="inline-flex min-h-11 items-center whitespace-nowrap rounded-xl px-3 text-sm font-semibold text-[var(--lf-foreground)] transition-colors hover:bg-[var(--lf-surface)]"
            >
              {signIn}
            </Link>
            <Link
              href="/get-started"
              dir={contentDirection}
              className="inline-flex min-h-11 items-center whitespace-nowrap rounded-2xl bg-primary px-4 text-sm font-bold text-[var(--lf-primary-foreground)] transition-colors hover:bg-primary-hover"
            >
              {primaryCta}
            </Link>
          </div>

          <button
            type="button"
            aria-label={isOpen ? closeLabel : menuLabel}
            aria-expanded={isOpen}
            aria-controls="marketing-mobile-menu"
            onClick={() => setIsOpen((open) => !open)}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-[var(--lf-border)] bg-[var(--lf-surface)] text-[var(--lf-foreground)] min-[1366px]:hidden"
          >
            {isOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </header>
      <div aria-hidden="true" className="h-[72px] shrink-0" />

      {isOpen
        ? createPortal(
            <>
              <button
                type="button"
                aria-label={closeLabel}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 z-[80] cursor-default bg-black/55 min-[1366px]:hidden"
              />
              <aside
                ref={drawerRef}
                id="marketing-mobile-menu"
                role="dialog"
                aria-modal="true"
                aria-label={translate(locale, "marketing.mobileNavLabel")}
                dir="ltr"
                className="lf-marketing-surface fixed inset-y-0 end-0 z-[90] flex h-[100dvh] w-80 max-w-[calc(100vw-1rem)] flex-col overflow-hidden border-s border-[var(--lf-border)] bg-[var(--lf-surface)] text-[var(--lf-foreground)] shadow-[var(--lf-shadow-overlay)] [overflow-wrap:anywhere] min-[1366px]:hidden"
              >
                <div className="flex items-center justify-between gap-3 border-b border-[var(--lf-border)] px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                  <Link href="/" onClick={() => setIsOpen(false)} className="inline-flex min-h-11 items-center">
                    <PlatformBrandIdentity
                      locale={locale}
                      showMark={false}
                      themeAdaptiveWordmark
                      fallbackText={brand}
                      wordmarkClassName="h-7 w-auto max-w-32"
                      wordmarkSize="marketing"
                    />
                  </Link>
                  <button
                    ref={closeButtonRef}
                    type="button"
                    aria-label={closeLabel}
                    onClick={() => setIsOpen(false)}
                    className="flex size-11 items-center justify-center rounded-xl border border-[var(--lf-border)] bg-[var(--lf-surface)] text-[var(--lf-foreground)]"
                  >
                    <X size={20} aria-hidden="true" />
                  </button>
                </div>
                <nav
                  aria-label={translate(locale, "marketing.mobileNavLabel")}
                  className="min-h-0 flex-1 overscroll-contain overflow-y-auto px-3 py-4"
                >
                  {navigation.map((item) => (
                    <MarketingNavLink
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className="flex min-h-12 items-center rounded-xl px-3 font-semibold leading-6 text-[var(--lf-foreground-muted)] transition-colors hover:bg-[var(--lf-surface-subtle)] hover:text-[var(--lf-foreground)]"
                      activeClassName="bg-[var(--lf-primary-soft)] text-[var(--lf-foreground)]"
                    >
                      <span className="w-full" dir={contentDirection}>
                        <MarketingBrandText text={item.label} />
                      </span>
                    </MarketingNavLink>
                  ))}
                </nav>
                <div className="grid gap-3 border-t border-[var(--lf-border)] bg-[var(--lf-surface-subtle)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                  <MarketingThemeSwitcher locale={locale} className="w-full" />
                  <LanguageSwitcher locale={locale} alternateOnly />
                  <Link
                    href="/login"
                    dir={contentDirection}
                    onClick={() => setIsOpen(false)}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--lf-border)] bg-[var(--lf-surface)] px-4 text-sm font-semibold text-[var(--lf-foreground)]"
                  >
                    {signIn}
                  </Link>
                  <Link
                    href="/get-started"
                    dir={contentDirection}
                    onClick={() => setIsOpen(false)}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-[var(--lf-primary-foreground)]"
                  >
                    {primaryCta}
                  </Link>
                </div>
              </aside>
            </>,
            document.body,
          )
        : null}
    </>
  );
}
