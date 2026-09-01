"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { TaneeLogo } from "@/components/marketing/tanee-logo";
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
  signIn,
  primaryCta,
  menuLabel,
  closeLabel,
  navigation,
}: MarketingHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
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
          ? "border-[#E6DED6] bg-[#FFF9F5]/95 shadow-[0_8px_30px_rgb(23_23_23/0.06)] backdrop-blur-xl"
          : "border-transparent bg-[#FFF9F5]/88 backdrop-blur-lg",
      )}
    >
      <div className="mx-auto flex min-h-16 w-full max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
        <Link href="/" className="inline-flex min-h-11 items-center">
          <TaneeLogo locale={locale} className="h-8 sm:h-9" />
        </Link>

        <nav
          aria-label={translate(locale, "marketing.primaryNavLabel")}
          className="hidden items-center gap-1 lg:flex"
        >
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-[#6F6862] transition hover:bg-white hover:text-[#171717]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <LanguageSwitcher locale={locale} />
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-[#171717] hover:bg-white"
          >
            {signIn}
          </Link>
          <Link
            href="/get-started"
            className="inline-flex min-h-11 items-center rounded-xl bg-[#FF6652] px-4 text-sm font-bold text-white shadow-[0_10px_24px_rgb(255_102_82/0.22)] transition hover:-translate-y-0.5 hover:bg-[#f45d4b]"
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
          className="inline-flex size-11 items-center justify-center rounded-xl border border-[#E6DED6] bg-white text-[#171717] lg:hidden"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {isOpen
        ? createPortal(
            <>
              <button
                type="button"
                aria-label={closeLabel}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 z-[80] bg-[#171717]/55 lg:hidden"
              />
              <aside
                ref={drawerRef}
                id="marketing-mobile-menu"
                role="dialog"
                aria-modal="true"
                aria-label={translate(locale, "marketing.mobileNavLabel")}
                className="fixed inset-y-0 end-0 z-[90] flex h-[100dvh] w-80 max-w-[calc(100vw-2rem)] flex-col border-s border-[#E6DED6] bg-[#FFF9F5] shadow-[0_24px_70px_rgb(23_23_23/0.22)] lg:hidden"
              >
                <div className="flex items-center justify-between border-b border-[#E6DED6] px-5 py-4">
                  <TaneeLogo locale={locale} className="h-8" />
                  <button
                    ref={closeButtonRef}
                    type="button"
                    aria-label={closeLabel}
                    onClick={() => setIsOpen(false)}
                    className="flex size-11 items-center justify-center rounded-xl border border-[#E6DED6] bg-white"
                  >
                    <X size={20} />
                  </button>
                </div>

                <nav className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
                  {navigation.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className="flex min-h-12 items-center rounded-xl px-4 font-semibold text-[#6F6862] hover:bg-white hover:text-[#171717]"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>

                <div className="grid gap-3 border-t border-[#E6DED6] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                  <LanguageSwitcher locale={locale} />
                  <Link
                    href="/login"
                    onClick={() => setIsOpen(false)}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#E6DED6] bg-white px-4 text-sm font-semibold"
                  >
                    {signIn}
                  </Link>
                  <Link
                    href="/get-started"
                    onClick={() => setIsOpen(false)}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#FF6652] px-4 text-sm font-bold text-white"
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
