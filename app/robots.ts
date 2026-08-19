import type { MetadataRoute } from "next";

import { PUBLIC_SITE_URL, publicSiteUrl } from "@/lib/urls/public-site-url";

const NON_MARKETING_PATHS = [
  "/api/",
  "/account",
  "/accept-owner-invitation",
  "/business-owners",
  "/businesses",
  "/card/",
  "/dashboard",
  "/experience-mode",
  "/forgot-password",
  "/join/",
  "/language",
  "/login",
  "/mfa/",
  "/onboarding",
  "/plans",
  "/reset-password",
  "/verify-email",
] as const;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/get-started"],
      disallow: [...NON_MARKETING_PATHS],
    },
    sitemap: publicSiteUrl("/sitemap.xml"),
    host: PUBLIC_SITE_URL,
  };
}
