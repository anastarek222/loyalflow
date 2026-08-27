"use client";

import { usePathname } from "next/navigation";

import AppSidebar from "@/components/app-sidebar";
import AppTopbar from "@/components/app-topbar";
import { AuthenticatedSupportLink } from "@/components/authenticated-support-link";
import MobileBottomNavigation from "@/components/mobile-bottom-navigation";
import {
  businessSlugFromPathname,
  type ShellBusiness,
  type ShellUser,
} from "@/lib/app-shell-navigation";
import type { ExperienceAccess, ExperienceMode } from "@/lib/experience-mode";

type Props = {
  children: React.ReactNode;
  language: "AR" | "EN";
  experienceMode: ExperienceMode;
  experienceAccess: ExperienceAccess;
  user: ShellUser & { firstName: string; lastName: string; email: string };
  businesses: ShellBusiness[];
};

export default function AuthenticatedAppShell({
  children,
  language,
  experienceMode,
  experienceAccess,
  user,
  businesses,
}: Props) {
  const pathname = usePathname();
  const activeBusiness = businesses.find(
    (business) => business.slug === businessSlugFromPathname(pathname),
  );
  const platformWorkspace = user.role === "SUPER_ADMIN" && !activeBusiness;

  return (
    <div
      className="lf-app-shell flex min-h-screen bg-canvas"
      data-platform-workspace={platformWorkspace ? "true" : undefined}
    >
      <a
        href="#app-content"
        className="sr-only z-[200] rounded-[var(--lf-radius-input)] bg-primary px-4 py-2 font-semibold text-white focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
      >
        {language === "AR" ? "الانتقال إلى المحتوى" : "Skip to content"}
      </a>
      <AppSidebar
        language={language}
        experienceMode={experienceMode}
        user={user}
        business={activeBusiness}
      />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <AppTopbar
          language={language}
          experienceMode={experienceMode}
          experienceAccess={experienceAccess}
          user={user}
          businesses={businesses}
          activeBusiness={activeBusiness}
        />
        <main
          id="app-content"
          className="relative min-w-0 flex-1 px-4 py-6 pb-[calc(var(--lf-mobile-nav-height)+1rem)] sm:px-6 sm:py-7 lg:px-8 lg:py-8 lg:pb-8 xl:px-10"
        >
          {children}
        </main>
      </div>
      <AuthenticatedSupportLink language={language} />
      <MobileBottomNavigation
        language={language}
        experienceMode={experienceMode}
        user={user}
        business={activeBusiness}
      />
    </div>
  );
}
