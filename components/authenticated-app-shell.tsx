"use client";

import { usePathname } from "next/navigation";

import AppSidebar from "@/components/app-sidebar";
import AppTopbar from "@/components/app-topbar";
import MobileBottomNavigation from "@/components/mobile-bottom-navigation";
import {
  businessSlugFromPathname,
  type ShellBusiness,
  type ShellUser,
} from "@/lib/app-shell-navigation";
import type { ExperienceMode } from "@/lib/experience-mode";

type Props = {
  children: React.ReactNode;
  language: "AR" | "EN";
  experienceMode: ExperienceMode;
  user: ShellUser & { firstName: string; lastName: string; email: string };
  businesses: ShellBusiness[];
};

export default function AuthenticatedAppShell({
  children,
  language,
  experienceMode,
  user,
  businesses,
}: Props) {
  const pathname = usePathname();
  const activeBusiness = businesses.find(
    (business) => business.slug === businessSlugFromPathname(pathname),
  );

  return (
    <div className="flex min-h-screen bg-canvas">
      <a
        href="#app-content"
        className="sr-only z-[200] rounded-md bg-primary px-4 py-2 font-semibold text-white focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
      >
        {language === "AR" ? "الانتقال إلى المحتوى" : "Skip to content"}
      </a>
      <AppSidebar language={language} experienceMode={experienceMode} user={user} business={activeBusiness} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar
          language={language}
          experienceMode={experienceMode}
          user={user}
          businesses={businesses}
          activeBusiness={activeBusiness}
        />
        <main
          id="app-content"
          className="min-w-0 flex-1 px-4 py-5 pb-28 sm:px-6 sm:py-6 lg:px-8 lg:pb-8"
        >
          {children}
        </main>
      </div>
      <MobileBottomNavigation
        language={language}
        experienceMode={experienceMode}
        user={user}
        business={activeBusiness}
      />
    </div>
  );
}
