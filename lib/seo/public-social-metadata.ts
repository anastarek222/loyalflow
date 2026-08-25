import type { Metadata } from "next";

import { platformBrand } from "@/lib/platform-brand";
import { publicSiteUrl } from "@/lib/urls/public-site-url";

type PublicSocialMetadataInput = Readonly<{
  title: string;
  description: string;
  path: "/" | "/get-started";
}>;

export function buildPublicSocialMetadata({
  title,
  description,
  path,
}: PublicSocialMetadataInput): Pick<Metadata, "openGraph" | "twitter"> {
  return {
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
