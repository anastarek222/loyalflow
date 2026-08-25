import type { Metadata } from "next";

import { publicSiteUrl } from "@/lib/urls/public-site-url";

export type PublicMarketingPath = "/" | "/get-started";

export function getPublicIndexingHeader(vercelEnvironment?: string) {
  if (vercelEnvironment !== "preview") {
    return null;
  }

  return {
    key: "X-Robots-Tag",
    value: "noindex, nofollow",
  } as const;
}

export function buildPublicPagePolicy(
  path: PublicMarketingPath,
  vercelEnvironment = process.env.VERCEL_ENV,
): Pick<Metadata, "alternates" | "robots"> {
  const canonicalUrl = publicSiteUrl(path);
  const indexable = vercelEnvironment === "production";

  return {
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
  };
}
