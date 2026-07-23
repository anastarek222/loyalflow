"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, LayoutDashboard, Menu, ScanLine, Users } from "lucide-react";

import {
  buildShellNavigation,
  isNavigationItemActive,
  type ShellBusiness,
  type ShellUser,
} from "@/lib/app-shell-navigation";
import type { ExperienceMode } from "@/lib/experience-mode";

type Props = {
  language: "AR" | "EN";
  experienceMode: ExperienceMode;
  user: ShellUser;
  business?: ShellBusiness;
};

const iconById = {
  overview: LayoutDashboard,
  customers: Users,
  scan: ScanLine,
  reports: BarChart3,
  more: Menu,
} as const;

export default function MobileBottomNavigation({ language, experienceMode, user, business }: Props) {
  const pathname = usePathname();
  if (!business) return null;

  const navigation = buildShellNavigation({ language, user, business, experienceMode });
  const entries = navigation.flatMap((group) => group.items);
  const overview = entries.find((entry) => entry.href === `/businesses/${business.slug}`);
  const customers = entries.find((entry) => entry.id === "customers");
  const scan = entries.find((entry) => entry.id === "scan");
  const activityOrReports = experienceMode === "SIMPLE"
    ? entries.find((entry) => entry.id === "activity")
    : entries.find((entry) => entry.id === "reports") ?? entries.find((entry) => entry.id === "activity");
  const bottomItems = [overview, customers, scan, activityOrReports].filter(Boolean) as typeof entries;

  return (
    <nav aria-label={language === "AR" ? "التنقل السريع" : "Quick navigation"} className="lf-mobile-nav fixed inset-x-0 bottom-0 z-30 border-t px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
        {bottomItems.map((entry) => {
          const Icon = iconById[entry.id as keyof typeof iconById] ?? LayoutDashboard;
          const active = isNavigationItemActive(pathname, entry.href);
          return <Link key={entry.href} href={entry.href} aria-current={active ? "page" : undefined} className={`flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-md px-1 text-[11px] font-semibold ${active ? "bg-indigo-50 text-primary" : "text-slate-600 hover:bg-surface-subtle"}`}><Icon size={19} aria-hidden="true" /><span className="truncate">{entry.label}</span></Link>;
        })}
        <button type="button" aria-label={language === "AR" ? "فتح القائمة" : "Open full menu"} onClick={() => window.dispatchEvent(new CustomEvent("loyalflow:open-navigation"))} className="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-md px-1 text-[11px] font-semibold text-slate-600 hover:bg-surface-subtle"><Menu size={19} aria-hidden="true" /><span>{language === "AR" ? "المزيد" : "More"}</span></button>
      </div>
    </nav>
  );
}
