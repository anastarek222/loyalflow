import type {
  Metadata,
  Viewport,
} from "next";

import "./globals.css";
import "./loyalflow-theme-aliases.css";
import { cookies } from "next/headers";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { getLocaleDirection } from "@/lib/i18n/config";
import { LOCALE_COOKIE_NAME, resolveRequestLocale } from "@/lib/i18n/request";
import { platformBrand } from "@/lib/platform-brand";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
  title: {
    default: platformBrand.name,
    template: `%s | ${platformBrand.name}`,
  },
  description: platformBrand.metadataDescription,
  applicationName: platformBrand.name,
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
  themeColor: platformBrand.themeColor,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = resolveRequestLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);
  const direction = getLocaleDirection(locale);

  return (
    <html
      lang={locale}
      dir={direction}
      className={cn("h-full bg-surface-subtle antialiased", "font-sans", geist.variable)}
    >
      <body className="flex min-h-full flex-col overflow-x-clip">
        {children}
      </body>
    </html>
  );
}
