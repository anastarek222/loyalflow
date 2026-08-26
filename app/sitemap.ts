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
    {
      url: publicSiteUrl("/features"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: publicSiteUrl("/pricing"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: publicSiteUrl("/about"),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: publicSiteUrl("/faq"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];
}
