import { auth } from "@/auth";

import {
  getLanguageDirection,
  normalizeLanguage,
} from "@/lib/i18n";

import prisma from "@/lib/prisma";

import LanguageSwitcher from "@/components/language-switcher";

import { redirect } from "next/navigation";

type AuthenticatedLocaleShellProps = {
  children: React.ReactNode;
};

export default async function AuthenticatedLocaleShell({
  children,
}: AuthenticatedLocaleShellProps) {
  const session =
    await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user =
    await prisma.user.findUnique({
      where: {
        id:
          session.user.id,
      },

      select: {
        language:
          true,
      },
    });

  const language =
    normalizeLanguage(
      user?.language
    );

  const direction =
    getLanguageDirection(
      language
    );

  return (
    <div
      lang={
        language === "AR"
          ? "ar"
          : "en"
      }
      dir={direction}
      data-app-language={
        language
      }
      className="min-h-screen"
    >
      <LanguageSwitcher
        language={language}
      />

      {children}
    </div>
  );
}
