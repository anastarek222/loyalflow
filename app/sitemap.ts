import type { MetadataRoute } from "next";

import { publicSiteUrl } from "@/lib/urls/public-site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: publicSiteUrl("/"),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: publicSiteUrl("/get-started"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];
}
