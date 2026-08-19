import type { MetadataRoute } from "next";
import { platformBrand } from "@/lib/platform-brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: platformBrand.name,
    short_name: platformBrand.shortName,
    description: platformBrand.manifestDescriptionAr,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: platformBrand.backgroundColor,
    theme_color: platformBrand.themeColor,
    lang: "ar",
    dir: "rtl",
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
