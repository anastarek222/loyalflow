import { ArrowRight, Mail, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Alexandria, Libre_Bodoni } from "next/font/google";

import { MarketingBrandText } from "@/components/marketing/marketing-brand-text";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { translate, type MessageKey } from "@/lib/i18n/catalog";
import { getLocaleDirection } from "@/lib/i18n/config";
import { getPublicMarketingNavigation } from "@/lib/marketing/public-navigation";
import { getMarketingRequestLocale } from "@/lib/marketing/request-locale";
import { getPublicSupportChannels } from "@/lib/marketing/public-support-channels";
import { buildPublicSocialMetadata } from "@/lib/seo/public-social-metadata";

const marketingSans = Alexandria({
  subsets: ["arabic", "latin"],
  variable: "--font-marketing-sans",
  display: "swap",
});

const marketingEditorial = Libre_Bodoni({
  subsets: ["latin"],
  variable: "--font-marketing-editorial",
  display: "swap",
});

const securityContent = {
  en: {
    metaTitle: "Security & Privacy | Tanee",
    metaDescription:
      "Learn how Tanee approaches team access, customer information, responsible data use, privacy, and account responsibility.",
    eyebrow: "Security & Privacy",
    title: "Your customer relationships deserve thoughtful care.",
    body: "Learn about access, customer information and responsible use of Tanee.",
    cards: [
      {
        title: "Access and responsibility",
        body: "Give your team access that fits their responsibilities. Keep account details private and review access when your team changes.",
      },
      {
        title: "Customer information",
        body: "A loyalty programme brings together customer details, activity and rewards. Collect and use that information responsibly, with clear communication to your customers.",
      },
      {
        title: "Clear policies",
        body: "Read our Privacy Policy for information about personal data, and our Terms and Conditions for the terms of using Tanee.",
      },
    ],
    privacy: "Privacy Policy",
    terms: "Terms and Conditions",
    contactTitle: "Have a security or privacy question?",
    contactBody: "Contact the Tanee team.",
    whatsapp: "WhatsApp",
    email: "Email us",
  },
  ar: {
    metaTitle: "الأمان والخصوصية | Tanee",
    metaDescription:
      "تعرّف على طريقة Tanee في إدارة وصول الفريق وبيانات العملاء والاستخدام المسؤول للبيانات والخصوصية ومسؤولية الحساب.",
    eyebrow: "الأمان والخصوصية",
    title: "علاقاتك مع عملائك تستحق الاهتمام.",
    body: "تعرّف على إدارة الوصول، وبيانات العملاء، والاستخدام المسؤول لـTanee.",
    cards: [
      {
        title: "الوصول والمسؤولية",
        body: "امنح كل فرد في فريقك صلاحية الوصول المناسبة لمسؤولياته. حافظ على سرية بيانات الدخول، وراجع الصلاحيات كلما تغيّر فريقك.",
      },
      {
        title: "بيانات العملاء",
        body: "يجمع برنامج الولاء بيانات العملاء ونشاطهم ومكافآتهم. احرص على جمع هذه البيانات واستخدامها بمسؤولية، مع توضيح طريقة استخدامها لعملائك.",
      },
      {
        title: "سياسات واضحة",
        body: "اطّلع على سياسة الخصوصية لمعرفة كيفية التعامل مع البيانات الشخصية، وعلى الشروط والأحكام لمعرفة شروط استخدام Tanee.",
      },
    ],
    privacy: "سياسة الخصوصية",
    terms: "الشروط والأحكام",
    contactTitle: "عندك سؤال عن الأمان أو الخصوصية؟",
    contactBody: "تواصل مع فريق Tanee.",
    whatsapp: "واتساب",
    email: "راسلنا بالإيميل",
  },
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getMarketingRequestLocale();
  const content = securityContent[locale];

  return {
    title: content.metaTitle,
    description: content.metaDescription,
    alternates: { canonical: "/security" },
    robots: { index: true, follow: true },
    ...buildPublicSocialMetadata({
      title: content.metaTitle,
      description: content.metaDescription,
      path: "/security",
    }),
  };
}

export default async function SecurityPage() {
  const locale = await getMarketingRequestLocale();
  const copy = (key: MessageKey) => translate(locale, key);
  const content = securityContent[locale];
  const supportChannels = getPublicSupportChannels().filter(
    (channel) => channel.kind === "whatsapp" || channel.kind === "email",
  );
  const editorialClass =
    locale === "en"
      ? "font-[var(--font-marketing-editorial)] font-normal tracking-tight"
      : "font-semibold tracking-normal";

  return (
    <main
      lang={locale}
      dir={getLocaleDirection(locale)}
      className={`${marketingSans.variable} ${marketingEditorial.variable} lf-marketing-surface min-h-screen overflow-x-clip bg-[var(--lf-marketing-canvas)] font-[var(--font-marketing-sans)] text-foreground [overflow-wrap:anywhere]`}
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

      <section className="mx-auto max-w-[1240px] px-5 pb-6 pt-12 text-center md:px-8 md:pb-8 md:pt-16">
        <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-semibold text-primary shadow-sm">
          <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
          <MarketingBrandText text={content.eyebrow} />
        </p>
        <h1
          className={`${editorialClass} mx-auto mb-4 mt-6 max-w-3xl text-balance ${locale === "en" ? "text-[34px] leading-[1.2] md:text-5xl lg:text-[54px]" : "text-[30px] leading-[1.4] md:text-5xl lg:text-[48px]"}`}
        >
          <MarketingBrandText text={content.title} />
        </h1>
        <p className="mx-auto max-w-2xl text-base leading-[1.8] text-foreground-muted md:text-lg">
          <MarketingBrandText text={content.body} />
        </p>
      </section>

      <section className="mx-auto mt-10 w-full max-w-5xl px-5 md:px-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {content.cards.map((card, index) => (
            <article
              key={card.title}
              className="flex min-w-0 flex-col items-start rounded-2xl border border-border bg-surface p-6 shadow-sm md:p-7"
            >
              <h2
                className={`${locale === "en" ? editorialClass : "font-semibold"} text-xl leading-[1.4]`}
              >
                {card.title}
              </h2>
              <p className="mt-4 text-sm leading-[1.8] text-foreground-muted md:text-base">
                <MarketingBrandText text={card.body} />
              </p>
              {index === 2 ? (
                <div className="mt-5 flex flex-col gap-2 text-sm font-medium text-primary">
                  <Link
                    href="/privacy"
                    className="inline-flex min-h-7 items-center gap-1 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
                  >
                    <span>{content.privacy}</span>
                    <ArrowRight
                      className="size-4 shrink-0 rtl:rotate-180"
                      aria-hidden="true"
                    />
                  </Link>
                  <Link
                    href="/terms"
                    className="inline-flex min-h-7 items-center gap-1 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
                  >
                    <span>{content.terms}</span>
                    <ArrowRight
                      className="size-4 shrink-0 rtl:rotate-180"
                      aria-hidden="true"
                    />
                  </Link>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="security-contact"
        className="mx-auto mt-12 w-full max-w-3xl px-5 pb-16 md:px-6 md:pb-20"
      >
        <div className="flex flex-col items-center justify-between gap-5 rounded-2xl border border-border bg-surface p-6 text-center shadow-sm sm:flex-row sm:text-start">
          <div className="min-w-0">
            <h2
              id="security-contact"
              className={`${locale === "en" ? editorialClass : "font-semibold"} text-lg leading-[1.4] md:text-xl`}
            >
              <MarketingBrandText text={content.contactTitle} />
            </h2>
            <p className="mt-1 text-sm text-foreground-muted">
              <MarketingBrandText text={content.contactBody} />
            </p>
          </div>
          <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row sm:justify-center">
            {supportChannels.map((channel) => {
              const isWhatsApp = channel.kind === "whatsapp";
              const Icon = isWhatsApp ? MessageCircle : Mail;
              return (
                <a
                  key={channel.kind}
                  href={channel.href}
                  target={isWhatsApp ? "_blank" : undefined}
                  rel={isWhatsApp ? "noopener noreferrer" : undefined}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-[var(--lf-marketing-canvas)] px-5 py-2.5 text-sm font-semibold transition-colors hover:border-primary/50 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {isWhatsApp ? content.whatsapp : content.email}
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <MarketingFooter locale={locale} />
    </main>
  );
}
