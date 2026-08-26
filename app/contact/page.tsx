import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { translate, type MessageKey } from "@/lib/i18n/catalog";
import { getLocaleDirection } from "@/lib/i18n/config";
import { getPublicMarketingNavigation } from "@/lib/marketing/public-navigation";
import { getMarketingRequestLocale } from "@/lib/marketing/request-locale";
import { getPublicSupportChannels } from "@/lib/marketing/public-support-channels";
import { buildPublicSocialMetadata } from "@/lib/seo/public-social-metadata";
import {
  ArrowUpRight,
  Building2,
  KeyRound,
  Mail,
  MailCheck,
  MessageCircle,
  Phone,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getMarketingRequestLocale();
  const title = translate(locale, "marketing.contact.metaTitle");
  const description = translate(locale, "marketing.contact.metaDescription");

  return {
    title,
    description,
    alternates: { canonical: "/contact" },
    robots: { index: true, follow: true },
    ...buildPublicSocialMetadata({ title, description, path: "/contact" }),
  };
}

export default async function ContactPage() {
  const locale = await getMarketingRequestLocale();
  const direction = getLocaleDirection(locale);
  const copy = (key: MessageKey) => translate(locale, key);
  const supportChannels = getPublicSupportChannels();
  const supportPresentation = {
    email: {
      icon: Mail,
      label: "marketing.contact.emailLabel",
    },
    whatsapp: {
      icon: MessageCircle,
      label: "marketing.contact.whatsappLabel",
    },
    phone: {
      icon: Phone,
      label: "marketing.contact.phoneLabel",
    },
  } as const;
  const paths = [
    {
      href: "/get-started",
      icon: Building2,
      title: "marketing.contact.setupTitle",
      body: "marketing.contact.setupBody",
      cta: "marketing.contact.setupCta",
    },
    {
      href: "/login",
      icon: KeyRound,
      title: "marketing.contact.accountTitle",
      body: "marketing.contact.accountBody",
      cta: "marketing.contact.accountCta",
    },
    {
      href: "/accept-owner-invitation",
      icon: MailCheck,
      title: "marketing.contact.invitationTitle",
      body: "marketing.contact.invitationBody",
      cta: "marketing.contact.invitationCta",
    },
  ] as const;

  return (
    <main
      lang={locale}
      dir={direction}
      className="min-h-screen bg-[var(--lf-marketing-canvas)] text-foreground"
    >
      <MarketingHeader
        locale={locale}
        brand={copy("common.brand")}
        signIn={copy("auth.signIn")}
        primaryCta={copy("marketing.primaryCta")}
        menuLabel={copy("marketing.menuOpen")}
        closeLabel={copy("marketing.menuClose")}
        navigation={getPublicMarketingNavigation(locale)}
      />

      <section className="border-b border-border bg-white px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mx-auto w-full max-w-5xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-primary">
            {copy("marketing.contact.eyebrow")}
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
            {copy("marketing.contact.title")}
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-foreground-muted">
            {copy("marketing.contact.body")}
          </p>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-3">
          {paths.map(({ href, icon: Icon, title, body, cta }) => (
            <article
              key={href}
              className="flex min-h-72 flex-col rounded-[var(--lf-radius-card)] border border-border bg-white p-6 shadow-sm sm:p-8"
            >
              <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon size={23} aria-hidden="true" />
              </span>
              <h2 className="mt-6 text-xl font-black">{copy(title)}</h2>
              <p className="mt-3 flex-1 text-sm leading-7 text-foreground-muted">
                {copy(body)}
              </p>
              <Link
                href={href}
                className="mt-7 inline-flex min-h-11 items-center justify-between gap-3 rounded-[var(--lf-radius-input)] bg-primary px-5 py-3 font-semibold text-white hover:bg-primary-hover"
              >
                {copy(cta)}
                <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>

        {supportChannels.length > 0 ? (
          <section
            className="mx-auto mt-10 w-full max-w-6xl"
            aria-labelledby="support-channels-title"
          >
            <h2 id="support-channels-title" className="text-2xl font-black">
              {copy("marketing.contact.supportTitle")}
            </h2>
            <p className="mt-2 text-sm leading-7 text-foreground-muted">
              {copy("marketing.contact.supportBody")}
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {supportChannels.map((channel) => {
                const presentation = supportPresentation[channel.kind];
                const Icon = presentation.icon;
                const external = channel.kind === "whatsapp";

                return (
                  <a
                    key={channel.kind}
                    href={channel.href}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noreferrer" : undefined}
                    className="flex min-h-20 items-center gap-4 rounded-[var(--lf-radius-input)] border border-border bg-white px-5 py-4 shadow-sm transition hover:border-primary/40 hover:text-primary"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon size={21} aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-black">
                        {copy(presentation.label)}
                      </span>
                      <span className="mt-1 block truncate text-sm text-foreground-muted">
                        {channel.displayValue}
                      </span>
                    </span>
                  </a>
                );
              })}
            </div>
          </section>
        ) : null}

        {supportChannels.length === 0 ? (
          <aside className="mx-auto mt-6 w-full max-w-6xl rounded-[var(--lf-radius-card)] border border-primary/20 bg-primary/5 px-5 py-6 sm:px-8">
            <h2 className="font-black">
              {copy("marketing.contact.noticeTitle")}
            </h2>
            <p className="mt-2 max-w-4xl text-sm leading-7 text-foreground-muted">
              {copy("marketing.contact.noticeBody")}
            </p>
          </aside>
        ) : null}
      </section>

      <MarketingFooter locale={locale} />
    </main>
  );
}
