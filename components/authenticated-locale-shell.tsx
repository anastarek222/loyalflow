import { auth } from "@/auth";

import {
  getLanguageAttributes,
} from "@/lib/i18n";
import {
  getExperienceModeCookieName,
  resolveExperienceAccess,
  resolveExperienceMode,
} from "@/lib/experience-mode";

import prisma from "@/lib/prisma";

import AuthenticatedAppShell from "@/components/authenticated-app-shell";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";

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
        email: true,
        id: true,
        role: true,
        experienceAccess: true,
        businessId: true,
        business: {
          select: {
            slug: true,
            name: true,
          },
        },
      },
    });

  const businesses = user?.role === "SUPER_ADMIN"
    ? await prisma.business.findMany({
        select: { id: true, name: true, slug: true },
        orderBy: { name: "asc" },
      })
    : user?.business
      ? [{
          id: user.businessId!,
          name: user.business.name,
          slug: user.business.slug,
        }]
      : [];


  const { language, lang, dir } =
    getLanguageAttributes(user?.language);
  const experienceMode = resolveExperienceMode(
    user ? (await cookies()).get(getExperienceModeCookieName(user.id))?.value : null,
    user?.role ?? "STAFF",
    user?.experienceAccess,
  );
  const experienceAccess = resolveExperienceAccess(user?.role ?? "STAFF", user?.experienceAccess);


  return (
    <div
      lang={lang}
      dir={dir}
      data-app-language={language}
      className="min-h-screen bg-slate-50"
    >

      <AuthenticatedAppShell
        language={language}
        experienceMode={experienceMode}
        experienceAccess={experienceAccess}
        businesses={businesses}
        user={{
          firstName: user?.firstName ?? "User",
          lastName: user?.lastName ?? "",
          email: user?.email ?? "",
          role: user?.role ?? "STAFF",
          businessId: user?.businessId,
          experienceAccess,
        }}
      >
        {children}
      </AuthenticatedAppShell>

    </div>
  );
}
