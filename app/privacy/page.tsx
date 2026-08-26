import { LegalDocumentPage } from "@/components/marketing/legal-document-page";
import { translate, type MessageKey } from "@/lib/i18n/catalog";
import { getPublicLegalProfile } from "@/lib/legal/public-legal-profile";
import { getMarketingRequestLocale } from "@/lib/marketing/request-locale";
import { buildPublicSocialMetadata } from "@/lib/seo/public-social-metadata";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getMarketingRequestLocale();
  const profile = getPublicLegalProfile();
  const title = translate(locale, "marketing.privacy.metaTitle");
  const description = translate(locale, "marketing.privacy.metaDescription");
  const social = buildPublicSocialMetadata({
    title,
    description,
    path: "/privacy",
  });

  return {
    title,
    description,
    alternates: { canonical: "/privacy" },
    ...social,
    robots: profile.isPublished
      ? social.robots
      : { index: false, follow: false },
  };
}

export default async function PrivacyPage() {
  const locale = await getMarketingRequestLocale();
  const profile = getPublicLegalProfile();
  const copy = (key: MessageKey) => translate(locale, key);
  const sections = [
    {
      title: "marketing.privacy.dataTitle",
      body: "marketing.privacy.dataBody",
    },
    {
      title: "marketing.privacy.useTitle",
      body: "marketing.privacy.useBody",
    },
    {
      title: "marketing.privacy.sharingTitle",
      body: "marketing.privacy.sharingBody",
    },
    {
      title: "marketing.privacy.cookiesTitle",
      body: "marketing.privacy.cookiesBody",
    },
    {
      title: "marketing.privacy.retentionTitle",
      body: "marketing.privacy.retentionBody",
    },
    {
      title: "marketing.privacy.choicesTitle",
      body: "marketing.privacy.choicesBody",
    },
  ] as const;

  return (
    <LegalDocumentPage
      locale={locale}
      copy={copy}
      eyebrow="marketing.privacy.eyebrow"
      title="marketing.privacy.title"
      introduction="marketing.privacy.introduction"
      sections={sections}
      {...profile}
    />
  );
}
