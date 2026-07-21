import { auth } from "@/auth";

import {
  getLanguageDirection,
  normalizeLanguage,
} from "@/lib/i18n";

import prisma from "@/lib/prisma";

import AppSidebar from "@/components/app-sidebar";
import AppTopbar from "@/components/app-topbar";

import { redirect } from "next/navigation";

type AuthenticatedLocaleShellProps = {
  children: React.ReactNode;
};

export default async function AuthenticatedLocaleShell({
  children,
}: AuthenticatedLocaleShellProps) {

  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }


  const user =
    await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },

      select: {
        language: true,
        firstName: true,
        lastName: true,
        role: true,
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
      data-app-language={language}
      className="min-h-screen bg-slate-50"
    >

      <div className="flex min-h-screen">

        <AppSidebar
          language={language}
        />


        <div className="flex min-w-0 flex-1 flex-col">

          <AppTopbar
            language={language}
            user={{
              firstName: user?.firstName ?? "User",
              lastName: user?.lastName ?? "",
              role: user?.role ?? "STAFF",
            }}
          />


          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            {children}
          </main>

        </div>

      </div>

    </div>
  );
}
