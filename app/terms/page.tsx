import { LegalDocumentPage } from "@/components/marketing/legal-document-page";
import { translate, type MessageKey } from "@/lib/i18n/catalog";
import { getPublicLegalProfile } from "@/lib/legal/public-legal-profile";
import { getMarketingRequestLocale } from "@/lib/marketing/request-locale";
import { buildPublicSocialMetadata } from "@/lib/seo/public-social-metadata";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getMarketingRequestLocale();
  const profile = getPublicLegalProfile();
  const title = translate(locale, "marketing.terms.metaTitle");
  const description = translate(locale, "marketing.terms.metaDescription");
  const social = buildPublicSocialMetadata({
    title,
    description,
    path: "/terms",
  });

  return {
    title,
    description,
    alternates: { canonical: "/terms" },
    ...social,
    robots: profile.isPublished
      ? social.robots
      : { index: false, follow: false },
  };
}

export default async function TermsPage() {
  const locale = await getMarketingRequestLocale();
  const profile = getPublicLegalProfile();
  const copy = (key: MessageKey) => translate(locale, key);
  const sections = [
    {
      title: "marketing.terms.accessTitle",
      body: "marketing.terms.accessBody",
    },
    {
      title: "marketing.terms.accountsTitle",
      body: "marketing.terms.accountsBody",
    },
    {
      title: "marketing.terms.loyaltyTitle",
      body: "marketing.terms.loyaltyBody",
    },
    {
      title: "marketing.terms.useTitle",
      body: "marketing.terms.useBody",
    },
    {
      title: "marketing.terms.billingTitle",
      body: "marketing.terms.billingBody",
    },
    {
      title: "marketing.terms.availabilityTitle",
      body: "marketing.terms.availabilityBody",
    },
  ] as const;

  return (
    <LegalDocumentPage
      locale={locale}
      copy={copy}
      eyebrow="marketing.terms.eyebrow"
      title="marketing.terms.title"
      introduction="marketing.terms.introduction"
      sections={sections}
      {...profile}
    />
  );
}
