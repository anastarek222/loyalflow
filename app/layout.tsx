import type {
  Metadata,
  Viewport,
} from "next";

import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
  title: {
    default: "LoyalFlow",
    template: "%s | LoyalFlow",
  },
  description:
    "Secure loyalty card and rewards management system.",
  applicationName: "LoyalFlow",
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full bg-surface-subtle antialiased", "font-sans", geist.variable)}
    >
      <body className="flex min-h-full flex-col">
        {children}
      </body>
    </html>
  );
}
