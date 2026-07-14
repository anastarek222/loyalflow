import type {
  Metadata,
  Viewport,
} from "next";

import "./globals.css";

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
      className="h-full bg-slate-100 antialiased"
    >
      <body className="flex min-h-full flex-col">
        {children}
      </body>
    </html>
  );
}
