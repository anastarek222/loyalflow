import { translate } from "@/lib/i18n/catalog";
import type { SupportedLocale } from "@/lib/i18n/config";
import { Sparkles } from "lucide-react";
import Link from "next/link";

export function MarketingFooter({ locale }: { locale: SupportedLocale }) {
  const copy = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  return (
    <footer className="border-t border-border bg-white px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-lg font-black text-foreground"
          >
            <Sparkles size={19} className="text-primary" aria-hidden="true" />
            {copy("common.brand")}
          </Link>
          <p className="mt-3 max-w-md text-sm leading-6 text-foreground-subtle">
            {copy("marketing.footerNote")}
          </p>
        </div>
        <nav
          aria-label={copy("marketing.primaryNavLabel")}
          className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-foreground-muted"
        >
          <Link href="/" className="hover:text-primary">
            {copy("marketing.navHome")}
          </Link>
          <Link href="/features" className="hover:text-primary">
            {copy("marketing.navFeatures")}
          </Link>
          <Link href="/pricing" className="hover:text-primary">
            {copy("marketing.navPricing")}
          </Link>
          <Link href="/about" className="hover:text-primary">
            {copy("marketing.navAbout")}
          </Link>
          <Link href="/faq" className="hover:text-primary">
            {copy("marketing.navFaq")}
          </Link>
          <Link href="/contact" className="hover:text-primary">
            {copy("marketing.navContact")}
          </Link>
          <Link href="/login" className="hover:text-primary">
            {copy("marketing.footerAccess")}
          </Link>
          <Link href="/accept-owner-invitation" className="hover:text-primary">
            {copy("marketing.invitationCta")}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
