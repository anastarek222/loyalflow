import {
  getLanguageAttributes,
} from "@/lib/i18n";
import {
  getExperienceModeCookieName,
  resolveExperienceAccess,
  resolveExperienceMode,
} from "@/lib/experience-mode";
import { getAuthenticatedRequestContext } from "@/lib/auth/authenticated-request-context";

import prisma from "@/lib/prisma";

import AuthenticatedAppShell from "@/components/authenticated-app-shell";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";

type AuthenticatedLocaleShellProps = {
  children: React.ReactNode;
};

const SUPER_ADMIN_SHELL_BUSINESS_LIMIT = 100;

export default async function AuthenticatedLocaleShell({
  children,
}: AuthenticatedLocaleShellProps) {

  const requestContext = await getAuthenticatedRequestContext();

  if (!requestContext) {
    redirect("/login");
  }

  const { user } = requestContext;

  // This shell wraps authenticated dashboard and tenant routes, but not
  // /onboarding itself. Pending owners therefore cannot navigate around setup.
  if (user?.role === "OWNER" && user.onboardingStatus === "PENDING") {
    redirect("/onboarding");
  }

  const businesses = user?.role === "SUPER_ADMIN"
    ? await prisma.business.findMany({
        select: { id: true, name: true, slug: true, plan: true },
        orderBy: [{ name: "asc" }, { id: "asc" }],
        take: SUPER_ADMIN_SHELL_BUSINESS_LIMIT,
      })
    : user?.business
      ? [{
          id: user.businessId!,
          name: user.business.name,
          slug: user.business.slug,
          plan: user.business.plan,
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
