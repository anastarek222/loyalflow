"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Building2,
  CreditCard,
  LayoutDashboard,
  Menu,
  ScanLine,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";

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
  businesses: Building2,
  owners: UserCog,
  plans: CreditCard,
  platformOps: ShieldCheck,
  more: Menu,
} as const;

export default function MobileBottomNavigation({
  language,
  experienceMode,
  user,
  business,
}: Props) {
  const pathname = usePathname();
  if (!business && user.role === "SUPER_ADMIN") {
    const platformItems = buildShellNavigation({
      language,
      user,
      experienceMode,
    }).flatMap((group) => group.items);

    return (
      <nav
        aria-label={
          language === "AR" ? "تنقل إدارة المنصة" : "Platform navigation"
        }
        className="lf-mobile-nav fixed inset-x-0 bottom-0 z-30 border-t px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 lg:hidden"
        data-platform-mobile-navigation="true"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
          {platformItems.map((entry) => {
            const Icon =
              iconById[entry.id as keyof typeof iconById] ?? LayoutDashboard;
            const active = isNavigationItemActive(pathname, entry.href);
            return (
              <Link
                key={entry.href}
                href={entry.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-semibold ${
                  active
                    ? "bg-primary-subtle text-primary"
                    : "text-foreground-muted hover:bg-surface-subtle"
                }`}
              >
                <Icon size={19} aria-hidden="true" />
                <span className="max-w-full truncate">{entry.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  if (!business) return null;

  const navigation = buildShellNavigation({
    language,
    user,
    business,
    experienceMode,
  });
  const entries = navigation.flatMap((group) => group.items);
  const overview = entries.find(
    (entry) => entry.href === `/businesses/${business.slug}`,
  );
  const customers = entries.find((entry) => entry.id === "customers");
  const scan = entries.find((entry) => entry.id === "scan");
  const activityOrReports =
    experienceMode === "SIMPLE"
      ? entries.find((entry) => entry.id === "activity")
      : (entries.find((entry) => entry.id === "reports") ??
        entries.find((entry) => entry.id === "activity"));
  const bottomItems = [overview, customers, scan, activityOrReports].filter(
    Boolean,
  ) as typeof entries;

  return (
    <nav
      aria-label={language === "AR" ? "التنقل السريع" : "Quick navigation"}
      className="lf-mobile-nav fixed inset-x-0 bottom-0 z-30 border-t px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 lg:hidden"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
        {bottomItems.map((entry) => {
          const Icon =
            iconById[entry.id as keyof typeof iconById] ?? LayoutDashboard;
          const active = isNavigationItemActive(pathname, entry.href);
          const isScan = entry.id === "scan";
          return (
            <Link
              key={entry.href}
              href={entry.href}
              aria-current={active ? "page" : undefined}
              className={
                isScan
                  ? "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl bg-primary px-1 text-[11px] font-bold text-white shadow-md shadow-primary/20"
                  : `flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] font-semibold ${active ? "bg-primary-subtle text-primary" : "text-foreground-muted hover:bg-surface-subtle"}`
              }
            >
              <Icon size={isScan ? 21 : 19} aria-hidden="true" />
              <span className="truncate">{entry.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          aria-label={language === "AR" ? "فتح القائمة" : "Open full menu"}
          onClick={() =>
            window.dispatchEvent(new CustomEvent("loyalflow:open-navigation"))
          }
          className="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-[var(--lf-radius-input)] px-1 text-[11px] font-semibold text-foreground-muted hover:bg-surface-subtle"
        >
          <Menu size={19} aria-hidden="true" />
          <span>{language === "AR" ? "المزيد" : "More"}</span>
        </button>
      </div>
    </nav>
  );
}
