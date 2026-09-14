import type { Metadata } from "next";
import { Alexandria, Libre_Bodoni } from "next/font/google";

import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { translate, type MessageKey } from "@/lib/i18n/catalog";
import { getLocaleDirection } from "@/lib/i18n/config";
import { getPublicLegalProfile } from "@/lib/legal/public-legal-profile";
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

const privacyContent = {
  en: {
    metaTitle: "Privacy Policy | Tanee",
    metaDescription:
      "Read the current Tanee Privacy Policy draft covering data collection, use, business-managed information, service providers, cookies, storage, privacy requests, and contact.",
    eyebrow: "Privacy Policy",
    draft: "Draft — pending content review",
    title: "Privacy Policy",
    updated: "Last updated: [Date to be confirmed]",
    privacyQuestions: "Privacy questions?",
    cookiePolicy: "Cookie Policy",
    sections: [
      {
        title: "01. Who operates Tanee",
        body: "[Full legal entity name, registration details and operating relationship will be added after the company documents are received.]",
      },
      {
        title: "02. Information we collect",
        body: "[Describe the personal information actually collected through the website and service.]",
      },
      {
        title: "03. How we use information",
        body: "[Describe verified purposes for using that information.]",
      },
      {
        title: "04. Information managed by businesses",
        body: "[Clarify Tanee’s role and each business’s role when handling loyalty customer information.]",
      },
      {
        title: "05. Service providers and sharing",
        body: "[Identify verified provider categories and circumstances in which information is shared.]",
      },
      {
        title: "06. Cookies and similar technologies",
        bodyBeforeLink: "[Describe technologies actually used and link to the ",
        bodyAfterLink: ".]",
        cookieSection: true,
      },
      {
        title: "07. Storage, retention and international transfers",
        body: "[Confirm storage locations, retention practices and applicable transfer arrangements.]",
      },
      {
        title: "08. Privacy requests",
        body: "[Explain the applicable request process after review.]",
      },
      {
        title: "09. Changes and contact",
        body: "[Explain how policy updates will be communicated.]",
      },
    ],
  },
  ar: {
    metaTitle: "سياسة الخصوصية | Tanee",
    metaDescription:
      "اطّلع على مسودة سياسة الخصوصية الحالية في Tanee، بما يشمل جمع البيانات واستخدامها وبيانات العملاء ومقدّمي الخدمات وملفات تعريف الارتباط والتخزين وطلبات الخصوصية والتواصل.",
    eyebrow: "سياسة الخصوصية",
    draft: "مسودة — المحتوى قيد المراجعة",
    title: "سياسة الخصوصية",
    updated: "آخر تحديث: [سيُحدَّد لاحقًا]",
    privacyQuestions: "عندك سؤال عن الخصوصية؟",
    cookiePolicy: "سياسة ملفات تعريف الارتباط",
    sections: [
      {
        title: "01. الجهة المشغّلة لـTanee",
        body: "[سيُضاف الاسم القانوني الكامل للجهة وبيانات تسجيلها وعلاقتها بتشغيل Tanee بعد استلام مستندات الشركة.]",
      },
      {
        title: "02. البيانات التي نجمعها",
        body: "[توضيح البيانات الشخصية التي تُجمع فعليًا من خلال الموقع والخدمة.]",
      },
      {
        title: "03. كيف نستخدم البيانات",
        body: "[توضيح الأغراض الفعلية التي تُستخدم البيانات من أجلها بعد التحقق منها.]",
      },
      {
        title: "04. البيانات التي تديرها الأنشطة",
        body: "[توضيح دور Tanee ودور كل نشاط عند التعامل مع بيانات عملاء برنامج الولاء.]",
      },
      {
        title: "05. مقدّمو الخدمات ومشاركة البيانات",
        body: "[تحديد فئات مقدّمي الخدمات والحالات التي تُشارك فيها البيانات بعد التحقق منها.]",
      },
      {
        title: "06. ملفات تعريف الارتباط والتقنيات المشابهة",
        bodyBeforeLink: "[توضيح التقنيات المستخدمة فعليًا، مع رابط إلى ",
        bodyAfterLink: ".]",
        cookieSection: true,
      },
      {
        title: "07. تخزين البيانات والاحتفاظ بها ونقلها دوليًا",
        body: "[تأكيد أماكن تخزين البيانات، وآلية الاحتفاظ بها، والترتيبات المطبّقة عند نقلها دوليًا.]",
      },
      {
        title: "08. طلبات الخصوصية",
        body: "[توضيح طريقة تقديم طلبات الخصوصية والتعامل معها بعد المراجعة.]",
      },
      {
        title: "09. التحديثات والتواصل",
        body: "[توضيح كيفية إبلاغ المستخدمين بتحديثات السياسة.]",
      },
    ],
  },
} as const;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getMarketingRequestLocale();
  const profile = getPublicLegalProfile();
  const content = privacyContent[locale];
  const social = buildPublicSocialMetadata({
    title: content.metaTitle,
    description: content.metaDescription,
    path: "/privacy",
  });

  return {
    title: content.metaTitle,
    description: content.metaDescription,
    alternates: { canonical: "/privacy" },
    ...social,
    robots: profile.isPublished
      ? social.robots
      : { index: false, follow: false },
  };
}

export default async function PrivacyPage() {
  const locale = await getMarketingRequestLocale();
  const copy = (key: MessageKey) => translate(locale, key);
  const content = privacyContent[locale];
  const email = getPublicSupportChannels().find(
    (channel) => channel.kind === "email",
  );
  const editorialTitleClass =
    locale === "en"
      ? "font-[var(--font-marketing-editorial)] font-semibold tracking-tight"
      : "font-bold tracking-normal";

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

      <article className="mx-auto w-full max-w-[800px] px-5 py-10 md:px-6 md:py-12">
        <header className="mb-8 border-b border-border pb-6 md:mb-10 md:pb-8">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {content.eyebrow}
            </span>
            <span className="inline-flex items-center rounded-full border border-border bg-surface-subtle px-2.5 py-0.5 text-xs font-medium text-foreground-muted">
              {content.draft}
            </span>
          </div>
          <h1
            className={`${editorialTitleClass} mb-3 text-[32px] leading-[1.25] md:text-[48px] ${locale === "ar" ? "md:leading-[1.4]" : "md:leading-[1.2]"}`}
          >
            {content.title}
          </h1>
          <p className="text-sm text-foreground-muted">{content.updated}</p>
        </header>

        <div className="space-y-8">
          {content.sections.map((section) => (
            <section
              key={section.title}
              id={"cookieSection" in section ? "cookies" : undefined}
            >
              <h2 className="mb-3 text-[20px] font-semibold leading-[1.4] md:text-[22px]">
                {section.title}
              </h2>
              {"cookieSection" in section ? (
                <p className="text-base leading-[1.8] text-foreground-muted md:text-lg md:leading-[1.7]">
                  {section.bodyBeforeLink}
                  <a
                    href="#cookies"
                    className="font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
                  >
                    {content.cookiePolicy}
                  </a>
                  {section.bodyAfterLink}
                </p>
              ) : (
                <p className="text-base leading-[1.8] text-foreground-muted md:text-lg md:leading-[1.7]">
                  {section.body}
                </p>
              )}
            </section>
          ))}

          <section className="border-t border-border pt-4">
            <p className="mb-2 text-sm font-medium text-foreground-muted">
              {content.privacyQuestions}
            </p>
            {email ? (
              <a
                href={email.href}
                className="inline-flex min-h-11 items-center text-base font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
              >
                {email.displayValue}
              </a>
            ) : null}
          </section>
        </div>
      </article>

      <MarketingFooter locale={locale} />
    </main>
  );
}
