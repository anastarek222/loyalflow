import type { ReactNode } from "react";
import Link from "next/link";

import { auth } from "@/auth";
import { normalizeLanguage } from "@/lib/i18n";
import prisma from "@/lib/prisma";

export default async function BusinessSettingsLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const [{ slug }, session] = await Promise.all([params, auth()]);
  const currentUser = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { language: true },
      })
    : null;
  const language = normalizeLanguage(currentUser?.language);
  const isArabic = language === "AR";

  return (
    <>
      <div className="border-b border-border bg-surface px-4 py-2 sm:px-6">
        <nav
          aria-label={isArabic ? "تنقل إعدادات النشاط" : "Business settings navigation"}
          dir={isArabic ? "rtl" : "ltr"}
          className="mx-auto flex max-w-7xl gap-2 overflow-x-auto"
          data-settings-subnavigation="true"
        >
          <Link
            href={`/businesses/${slug}/settings`}
            className="min-h-10 shrink-0 rounded-lg px-3 py-2 text-sm font-bold text-foreground-muted hover:bg-primary-soft hover:text-primary"
          >
            {isArabic ? "الإعدادات العامة" : "General settings"}
          </Link>
          <Link
            href={`/businesses/${slug}/settings/whatsapp`}
            className="min-h-10 shrink-0 rounded-lg px-3 py-2 text-sm font-bold text-foreground-muted hover:bg-primary-soft hover:text-primary"
          >
            {isArabic ? "واتساب" : "WhatsApp"}
          </Link>
        </nav>
      </div>
      {children}
    </>
  );
}
