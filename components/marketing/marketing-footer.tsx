import Link from "next/link";

import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { MarketingBrandText } from "@/components/marketing/marketing-brand-text";
import { MarketingNavLink } from "@/components/marketing/marketing-nav-link";
import { MarketingThemeSwitcher } from "@/components/marketing/marketing-theme-switcher";
import { PlatformBrandIdentity } from "@/components/platform-brand-identity";
import { translate } from "@/lib/i18n/catalog";
import type { SupportedLocale } from "@/lib/i18n/config";
import { getPublicMarketingFooterNavigation } from "@/lib/marketing/public-navigation";
import {
  getPublicSocialLinks,
  type PublicSocialKind,
} from "@/lib/marketing/public-social-links";

const footerLinkClassName =
  "inline-flex min-h-11 items-center rounded-lg text-start transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--lf-surface)]";
const footerLinkActiveClassName = "font-semibold text-primary";

function SocialBrandIcon({ kind }: { kind: PublicSocialKind }) {
  const commonProps = {
    viewBox: "0 0 24 24",
    className: "size-[18px]",
    "aria-hidden": true,
  } as const;

  if (kind === "instagram") {
    return (
      <svg {...commonProps} fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (kind === "facebook") {
    return (
      <svg {...commonProps} fill="currentColor">
        <path d="M13.8 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5H17V3.9c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4V10H8v3h2.8v8h3Z" />
      </svg>
    );
  }

  if (kind === "linkedin") {
    return (
      <svg {...commonProps} fill="currentColor">
        <path d="M5.3 7.9A1.9 1.9 0 1 0 5.3 4a1.9 1.9 0 0 0 0 3.9ZM3.7 20h3.2V9.4H3.7V20ZM9 9.4h3.1v1.5h.1c.4-.8 1.5-1.9 3.2-1.9 3.4 0 4 2.2 4 5.1V20h-3.2v-5.2c0-1.2 0-2.8-1.8-2.8s-2 1.3-2 2.7V20H9V9.4Z" />
      </svg>
    );
  }

  if (kind === "tiktok") {
    return (
      <svg {...commonProps} fill="currentColor">
        <path d="M15.3 3c.4 2.2 1.7 3.5 3.7 3.7v3a7.5 7.5 0 0 1-3.6-1v6.2a5.9 5.9 0 1 1-5.1-5.8v3.1a2.9 2.9 0 1 0 2 2.7V3h3Z" />
      </svg>
    );
  }

  return (
    <svg {...commonProps} fill="currentColor">
      <path d="M21.6 7.2a2.8 2.8 0 0 0-2-2C17.8 4.7 12 4.7 12 4.7s-5.8 0-7.6.5a2.8 2.8 0 0 0-2 2A29 29 0 0 0 2 12a29 29 0 0 0 .4 4.8 2.8 2.8 0 0 0 2 2c1.8.5 7.6.5 7.6.5s5.8 0 7.6-.5a2.8 2.8 0 0 0 2-2A29 29 0 0 0 22 12a29 29 0 0 0-.4-4.8ZM10 15.2V8.8l5.5 3.2-5.5 3.2Z" />
    </svg>
  );
}

export function MarketingFooter({ locale }: { locale: SupportedLocale }) {
  const copy = (key: Parameters<typeof translate>[1]) => translate(locale, key);
  const socialLinks = getPublicSocialLinks();
  const navigation = getPublicMarketingFooterNavigation(locale);
  const contentDirection = locale === "ar" ? "rtl" : "ltr";

  return (
    <footer
      dir="ltr"
      data-testid="marketing-footer"
      className="lf-marketing-surface border-t border-[var(--lf-border)] bg-[var(--lf-surface)] px-5 pb-8 pt-16 text-[var(--lf-foreground)] sm:px-8 lg:px-10 lg:pt-20"
    >
      <div className="mx-auto w-full max-w-[1440px]">
        <div className="grid gap-12 border-b border-[var(--lf-border)] pb-14 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-lg font-black text-[var(--lf-foreground)]"
            >
              <PlatformBrandIdentity
                locale={locale}
                showMark={false}
                themeAdaptiveWordmark
                fallbackText={copy("common.brand")}
                markClassName="flex size-7 items-center justify-center text-xl text-primary"
                wordmarkClassName="h-8 w-auto max-w-40"
                wordmarkSize="marketing-footer"
              />
            </Link>
            <p
              dir={contentDirection}
              className="mt-5 max-w-sm text-sm leading-7 text-[var(--lf-foreground-muted)]"
            >
              {copy("marketing.footerNote")}
            </p>
            {socialLinks.length > 0 ? (
              <nav
                aria-label={copy("marketing.socialLinksLabel")}
                className="mt-5 flex flex-wrap gap-2"
                data-testid="marketing-social-links"
              >
                {socialLinks.map((link) => (
                  <a
                    key={link.kind}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    title={link.label}
                    className="inline-flex size-11 items-center justify-center rounded-xl border border-[var(--lf-border)] text-[var(--lf-foreground-muted)] transition hover:border-primary/30 hover:text-primary"
                  >
                    <SocialBrandIcon kind={link.kind} />
                    <span className="sr-only">{link.label}</span>
                  </a>
                ))}
              </nav>
            ) : null}
          </div>

          <nav
            aria-label={copy("marketing.primaryNavLabel")}
            data-testid="marketing-footer-navigation"
            className="grid grid-cols-2 gap-x-6 gap-y-10 lg:col-span-8 lg:grid-cols-4"
          >
            <div dir={contentDirection}>
              <h2 className="text-xs font-black uppercase tracking-[0.14em] text-[var(--lf-foreground)]">
                {copy("marketing.footerProduct")}
              </h2>
              <ul className="mt-3 space-y-0 text-sm text-[var(--lf-foreground-muted)]">
                {navigation.product.map((item) => (
                  <li key={item.href}>
                    <MarketingNavLink
                      href={item.href}
                      className={footerLinkClassName}
                      activeClassName={footerLinkActiveClassName}
                    >
                      <MarketingBrandText text={item.label} />
                    </MarketingNavLink>
                  </li>
                ))}
              </ul>
            </div>
            <div dir={contentDirection}>
              <h2 className="text-xs font-black uppercase tracking-[0.14em] text-[var(--lf-foreground)]">
                <MarketingBrandText text="Tanee" />
              </h2>
              <ul className="mt-3 space-y-0 text-sm text-[var(--lf-foreground-muted)]">
                {navigation.brand.map((item) => (
                  <li key={item.href}>
                    <MarketingNavLink
                      href={item.href}
                      className={footerLinkClassName}
                      activeClassName={footerLinkActiveClassName}
                    >
                      <MarketingBrandText text={item.label} />
                    </MarketingNavLink>
                  </li>
                ))}
              </ul>
            </div>
            <div dir={contentDirection}>
              <h2 className="text-xs font-black uppercase tracking-[0.14em] text-[var(--lf-foreground)]">
                {copy("marketing.footerSupport")}
              </h2>
              <ul className="mt-3 space-y-0 text-sm text-[var(--lf-foreground-muted)]">
                {navigation.support.map((item) => (
                  <li key={item.href}>
                    <MarketingNavLink
                      href={item.href}
                      className={footerLinkClassName}
                      activeClassName={footerLinkActiveClassName}
                    >
                      <MarketingBrandText text={item.label} />
                    </MarketingNavLink>
                  </li>
                ))}
                <li>
                  <MarketingNavLink
                    href="/login"
                    className={footerLinkClassName}
                    activeClassName={footerLinkActiveClassName}
                  >
                    {copy("marketing.footerAccess")}
                  </MarketingNavLink>
                </li>
              </ul>
            </div>
            <div dir={contentDirection}>
              <h2 className="text-xs font-black uppercase tracking-[0.14em] text-[var(--lf-foreground)]">
                {copy("marketing.footerLegal")}
              </h2>
              <ul className="mt-3 space-y-0 text-sm text-[var(--lf-foreground-muted)]">
                <li>
                  <MarketingNavLink
                    href="/privacy"
                    className={footerLinkClassName}
                    activeClassName={footerLinkActiveClassName}
                  >
                    {copy("marketing.navPrivacy")}
                  </MarketingNavLink>
                </li>
                <li>
                  <MarketingNavLink
                    href="/terms"
                    className={footerLinkClassName}
                    activeClassName={footerLinkActiveClassName}
                  >
                    {copy("marketing.navTerms")}
                  </MarketingNavLink>
                </li>
                <li>
                  <MarketingNavLink
                    href="/data-deletion"
                    className={footerLinkClassName}
                    activeClassName={footerLinkActiveClassName}
                  >
                    {copy("marketing.navDataDeletion")}
                  </MarketingNavLink>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        <div className="flex flex-col gap-5 pt-7 md:flex-row md:items-center md:justify-between">
          <p dir={contentDirection} className="text-sm text-[var(--lf-foreground-subtle)]">
            <MarketingBrandText text={copy("marketing.footerRights")} />
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <MarketingThemeSwitcher locale={locale} />
            <LanguageSwitcher locale={locale} alternateOnly />
            <MarketingNavLink
              href="/login"
              className="inline-flex min-h-11 items-center px-3 text-sm font-bold text-[var(--lf-foreground-muted)] hover:text-primary"
              activeClassName="text-primary"
            >
              <span dir={contentDirection}>{copy("marketing.footerAccess")}</span>
            </MarketingNavLink>
          </div>
        </div>
      </div>
    </footer>
  );
}
