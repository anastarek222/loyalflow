import type { MetadataRoute } from "next";
import { cookies } from "next/headers";

import { translate } from "@/lib/i18n/catalog";
import { getLocaleDirection } from "@/lib/i18n/config";
import { LOCALE_COOKIE_NAME, resolveRequestLocale } from "@/lib/i18n/request";
import { platformBrand } from "@/lib/platform-brand";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const cookieStore = await cookies();
  const locale = resolveRequestLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);

  return {
    name: platformBrand.name,
    short_name: platformBrand.shortName,
    description: translate(locale, "marketing.metaDescription"),
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: platformBrand.backgroundColor,
    theme_color: platformBrand.themeColor,
    lang: locale,
    dir: getLocaleDirection(locale),
    categories: [
      "business",
      "productivity",
    ],
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
