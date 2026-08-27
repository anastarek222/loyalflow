import { translate } from "@/lib/i18n/catalog";
import type { SupportedLocale } from "@/lib/i18n/config";
import {
  getPublicSocialLinks,
  type PublicSocialKind,
} from "@/lib/marketing/public-social-links";
import {
  Facebook,
  Instagram,
  Linkedin,
  Music2,
  Sparkles,
  Youtube,
} from "lucide-react";
import Link from "next/link";

const socialIcons = {
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  tiktok: Music2,
  youtube: Youtube,
} satisfies Record<PublicSocialKind, typeof Instagram>;

export function MarketingFooter({ locale }: { locale: SupportedLocale }) {
  const copy = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const socialLinks = getPublicSocialLinks();

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
          {socialLinks.length > 0 ? (
            <nav
              aria-label={locale === "ar" ? "روابط التواصل الاجتماعي" : "Social links"}
              className="mt-4 flex flex-wrap items-center gap-2"
              data-testid="marketing-social-links"
            >
              {socialLinks.map((link) => {
                const Icon = socialIcons[link.kind];
                return (
                  <a
                    key={link.kind}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    title={link.label}
                    className="inline-flex size-11 items-center justify-center rounded-xl border border-border bg-surface text-foreground-muted transition hover:border-primary/30 hover:text-primary"
                  >
                    <Icon size={19} aria-hidden="true" />
                    <span className="sr-only">{link.label}</span>
                  </a>
                );
              })}
            </nav>
          ) : null}
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
          <Link href="/privacy" className="hover:text-primary">
            {copy("marketing.navPrivacy")}
          </Link>
          <Link href="/terms" className="hover:text-primary">
            {copy("marketing.navTerms")}
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
