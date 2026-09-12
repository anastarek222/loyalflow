import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { MarketingThemeSwitcher } from "@/components/marketing/marketing-theme-switcher";
import { PlatformBrandIdentity } from "@/components/platform-brand-identity";
import { translate } from "@/lib/i18n/catalog";
import type { SupportedLocale } from "@/lib/i18n/config";
import {
  getPublicSocialLinks,
  type PublicSocialKind,
} from "@/lib/marketing/public-social-links";
import { Briefcase, Camera, MessageCircle, Music2, Play } from "lucide-react";
import Link from "next/link";

const socialIcons = {
  instagram: Camera,
  facebook: MessageCircle,
  linkedin: Briefcase,
  tiktok: Music2,
  youtube: Play,
} satisfies Record<PublicSocialKind, typeof Camera>;

export function MarketingFooter({ locale }: { locale: SupportedLocale }) {
  const copy = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const socialLinks = getPublicSocialLinks();

  return (
    <footer className="border-t border-border bg-surface px-5 pb-8 pt-16 sm:px-8 lg:px-10 lg:pt-20">
      <div className="mx-auto w-full max-w-[1240px]">
        <div className="grid gap-12 border-b border-border pb-14 md:grid-cols-12">
          <div className="md:col-span-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-lg font-black text-foreground"
            >
              <PlatformBrandIdentity
                locale={locale}
                showMark={false}
                themeAdaptiveWordmark
                fallback="sparkles"
                fallbackText={copy("common.brand")}
                markClassName="flex size-7 items-center justify-center text-xl text-primary"
                wordmarkClassName="h-8 w-auto max-w-40"
                wordmarkSize="marketing-footer"
              />
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-7 text-foreground-muted">
              {copy("marketing.footerNote")}
            </p>
            {socialLinks.length > 0 ? (
              <nav
                aria-label={copy("marketing.socialLinksLabel")}
                className="mt-5 flex flex-wrap gap-2"
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
                      className="inline-flex size-11 items-center justify-center rounded-xl border border-border text-foreground-muted transition hover:border-primary/30 hover:text-primary"
                    >
                      <Icon size={18} aria-hidden="true" />
                      <span className="sr-only">{link.label}</span>
                    </a>
                  );
                })}
              </nav>
            ) : null}
          </div>

          <nav
            aria-label={copy("marketing.primaryNavLabel")}
            className="grid grid-cols-2 gap-x-6 gap-y-10 md:col-span-8 md:grid-cols-4"
          >
            <div>
              <h2 className="text-xs font-black uppercase tracking-[0.14em] text-foreground">
                {copy("marketing.footerProduct")}
              </h2>
              <ul className="mt-5 space-y-3 text-sm text-foreground-muted">
                <li>
                  <Link href="/" className="hover:text-primary">
                    {copy("marketing.navHome")}
                  </Link>
                </li>
                <li>
                  <Link href="/features" className="hover:text-primary">
                    {copy("marketing.navFeatures")}
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-primary">
                    {copy("marketing.navPricing")}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-[0.14em] text-foreground">
                {copy("common.brand")}
              </h2>
              <ul className="mt-5 space-y-3 text-sm text-foreground-muted">
                <li>
                  <Link href="/about" className="hover:text-primary">
                    {copy("marketing.navAbout")}
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-primary">
                    {copy("marketing.navContact")}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-[0.14em] text-foreground">
                {copy("marketing.footerSupport")}
              </h2>
              <ul className="mt-5 space-y-3 text-sm text-foreground-muted">
                <li>
                  <Link href="/faq" className="hover:text-primary">
                    {copy("marketing.navFaq")}
                  </Link>
                </li>
                <li>
                  <Link href="/login" className="hover:text-primary">
                    {copy("marketing.footerAccess")}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-[0.14em] text-foreground">
                {copy("marketing.footerLegal")}
              </h2>
              <ul className="mt-5 space-y-3 text-sm text-foreground-muted">
                <li>
                  <Link href="/privacy" className="hover:text-primary">
                    {copy("marketing.navPrivacy")}
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-primary">
                    {copy("marketing.navTerms")}
                  </Link>
                </li>
                <li>
                  <Link href="/data-deletion" className="hover:text-primary">
                    {copy("marketing.navDataDeletion")}
                  </Link>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        <div className="flex flex-col gap-5 pt-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground-subtle">
            {copy("marketing.footerRights")}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <MarketingThemeSwitcher locale={locale} />
            <LanguageSwitcher locale={locale} alternateOnly />
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center px-3 text-sm font-bold text-foreground-muted hover:text-primary"
            >
              {copy("marketing.footerAccess")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
