import type { Metadata } from "next";

import { platformBrand } from "@/lib/platform-brand";

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
      url: path,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}
