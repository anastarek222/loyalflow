"use client";

import { Menu, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { LanguageSwitcher } from "@/components/i18n/language-switcher";
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
  navigation: Array<{ href: string; label: string }>;
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

  useEffect(() => {
    const updateHeader = () => setIsScrolled(window.scrollY > 12);
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    return () => window.removeEventListener("scroll", updateHeader);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-[background-color,border-color,box-shadow] duration-200",
        isScrolled
          ? "border-white/70 bg-white/92 shadow-[0_8px_30px_rgb(15_23_42/0.07)] backdrop-blur-xl"
          : "border-transparent bg-white/68 backdrop-blur-lg",
      )}
    >
      <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group inline-flex min-h-11 items-center gap-2.5 rounded-xl font-black tracking-tight text-foreground"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-white shadow-[0_8px_20px_rgb(79_70_229/0.22)] transition-transform duration-200 group-hover:-translate-y-0.5">
            <Sparkles size={18} aria-hidden="true" />
          </span>
          <span className="text-lg sm:text-xl">{brand}</span>
        </Link>

        <nav
          aria-label={translate(locale, "marketing.primaryNavLabel")}
          className="hidden items-center gap-1 lg:flex"
        >
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-foreground-muted transition-colors hover:bg-white/80 hover:text-foreground"
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
            className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-bold text-white shadow-[0_8px_20px_rgb(79_70_229/0.2)] transition-[background-color,transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-[0_12px_26px_rgb(79_70_229/0.28)] active:translate-y-0"
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
          className="inline-flex size-11 items-center justify-center rounded-xl border border-border bg-white/80 text-foreground shadow-sm lg:hidden"
        >
          {isOpen ? (
            <X size={20} aria-hidden="true" />
          ) : (
            <Menu size={20} aria-hidden="true" />
          )}
        </button>
      </div>

      {isOpen ? (
        <div
          id="marketing-mobile-menu"
          className="border-t border-border/80 bg-white/96 px-4 py-4 shadow-[0_18px_30px_rgb(15_23_42/0.09)] backdrop-blur-xl lg:hidden"
        >
          <nav
            aria-label={translate(locale, "marketing.mobileNavLabel")}
            className="mx-auto grid max-w-7xl gap-1"
          >
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="flex min-h-12 items-center rounded-xl px-3 font-semibold text-foreground-muted hover:bg-surface-subtle hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mx-auto mt-4 flex max-w-7xl flex-wrap items-center gap-2 border-t border-border pt-4">
            <LanguageSwitcher locale={locale} />
            <Link
              href="/login"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-border bg-white px-4 text-sm font-semibold text-foreground"
            >
              {signIn}
            </Link>
            <Link
              href="/get-started"
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-white"
            >
              {primaryCta}
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
