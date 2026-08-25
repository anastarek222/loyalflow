import type { Metadata } from "next";

import { platformBrand } from "@/lib/platform-brand";
import {
  buildPublicPagePolicy,
  type PublicMarketingPath,
} from "@/lib/seo/public-page-metadata";
import { publicSiteUrl } from "@/lib/urls/public-site-url";

type PublicSocialMetadataInput = Readonly<{
  title: string;
  description: string;
  path: PublicMarketingPath;
}>;

export function buildPublicSocialMetadata({
  title,
  description,
  path,
}: PublicSocialMetadataInput): Pick<
  Metadata,
  "alternates" | "robots" | "openGraph" | "twitter"
> {
  return {
    ...buildPublicPagePolicy(path),
    openGraph: {
      type: "website",
      siteName: platformBrand.name,
      title,
      description,
      url: publicSiteUrl(path),
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}
