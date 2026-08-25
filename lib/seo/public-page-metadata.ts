import type { Metadata } from "next";

import { buildPublicSocialMetadata } from "@/lib/seo/public-social-metadata";
import { publicSiteUrl } from "@/lib/urls/public-site-url";

type PublicMarketingPath = "/" | "/get-started";

type PublicPageMetadataInput = Readonly<{
  title: string;
  description: string;
  path: PublicMarketingPath;
  vercelEnvironment?: string;
}>;

export function getPublicIndexingHeader(vercelEnvironment?: string) {
  if (vercelEnvironment !== "preview") {
    return null;
  }

  return {
    key: "X-Robots-Tag",
    value: "noindex, nofollow",
  } as const;
}

export function buildPublicPageMetadata({
  title,
  description,
  path,
  vercelEnvironment = process.env.VERCEL_ENV,
}: PublicPageMetadataInput): Metadata {
  const canonicalUrl = publicSiteUrl(path);
  const indexable = vercelEnvironment === "production";

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        en: canonicalUrl,
        ar: canonicalUrl,
        "x-default": canonicalUrl,
      },
    },
    robots: {
      index: indexable,
      follow: indexable,
    },
    ...buildPublicSocialMetadata({
      title,
      description,
      path,
    }),
  };
}
