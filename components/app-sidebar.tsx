"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CreditCard,
  Building2,
  FolderCog,
  Gift,
  GitBranch,
  LayoutDashboard,
  Megaphone,
  Radio,
  ScanLine,
  Settings,
  ShieldCheck,
  Tags,
  UserCog,
  Users,
} from "lucide-react";

import {
  buildShellNavigation,
  isNavigationItemActive,
  type ShellBusiness,
  type ShellNavigationItem,
  type ShellUser,
} from "@/lib/app-shell-navigation";
import type { ExperienceMode } from "@/lib/experience-mode";

type Props = {
  language: "AR" | "EN";
  experienceMode: ExperienceMode;
  user: ShellUser;
  business?: ShellBusiness;
};

const icons: Record<ShellNavigationItem["icon"], React.ElementType> = {
  overview: LayoutDashboard,
  businesses: Building2,
  owners: UserCog,
  plans: CreditCard,
  platformOps: ShieldCheck,
  scan: ScanLine,
  customers: Users,
  activity: Radio,
  program: CreditCard,
  rewards: Gift,
  offers: Tags,
  campaigns: Megaphone,
  recovery: ShieldCheck,
  reports: BarChart3,
  staffReports: BarChart3,
  team: UserCog,
  branches: GitBranch,
  settings: Settings,
  duplicates: Users,
  playbooks: FolderCog,
};

export default function AppSidebar({
  language,
  experienceMode,
  user,
  business,
}: Props) {
  const pathname = usePathname();
  const platformWorkspace = user.role === "SUPER_ADMIN" && !business;
  const groups = buildShellNavigation({
    language,
    user,
    business,
    experienceMode,
  });

  const activeHref = groups
    .flatMap((group) => group.items)
    .filter(
      (entry) => !entry.action && isNavigationItemActive(pathname, entry.href),
    )
    .sort((first, second) => second.href.length - first.href.length)[0]?.href;

  return (
    <aside
      className="lf-nav-sidebar sticky top-0 hidden h-screen w-72 shrink-0 self-start border-e lg:flex lg:flex-col"
      aria-label={language === "AR" ? "التنقل الرئيسي" : "Primary navigation"}
      data-platform-sidebar={platformWorkspace ? "true" : undefined}
    >
      <div className="px-5 pb-4 pt-5">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-[var(--lf-radius-input)] px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lf-focus)]"
        >
          <span className="lf-brand-mark flex size-10 items-center justify-center rounded-[var(--lf-radius-md)] text-lg font-black text-primary-foreground shadow-sm">
            L
          </span>
          <span>
            <span className="block text-base font-black tracking-[-0.02em] text-foreground">
              LoyalFlow
            </span>
            <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground-subtle">
              {platformWorkspace
                ? language === "AR"
                  ? "إدارة المنصة"
                  : "Platform administration"
                : language === "AR"
                  ? "مساحة الولاء"
                  : "Loyalty workspace"}
            </span>
          </span>
        </Link>
      </div>
      {business && (
        <div
          className="mx-4 rounded-[var(--lf-radius-lg)] border border-primary/10 bg-[var(--lf-primary-soft)] px-4 py-3"
          data-current-business-context="true"
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-primary/75">
            {language === "AR" ? "النشاط الحالي" : "Current business"}
          </p>
          <p
            className="mt-1 truncate text-sm font-bold text-foreground"
            title={business.name}
          >
            {business.name}
          </p>
        </div>
      )}
      {platformWorkspace ? (
        <div
          className="mx-4 rounded-[var(--lf-radius-lg)] border border-primary/20 bg-[var(--lf-primary-soft)] px-4 py-3"
          data-platform-context="true"
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-primary">
            {language === "AR" ? "نطاق عالمي" : "Global scope"}
          </p>
          <p className="mt-1 text-sm font-bold text-foreground">
            {language === "AR"
              ? "الأنشطة والملاك والتشغيل"
              : "Businesses, owners & operations"}
          </p>
        </div>
      ) : null}
      <nav className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
        {groups.map((group) => (
          <section key={group.id} className="mb-6 last:mb-0">
            {group.label && (
              <h2 className="lf-nav-group-label mb-2 px-3">{group.label}</h2>
            )}
            <ul className="space-y-1.5">
              {group.items.map((entry) => {
                const Icon = icons[entry.icon];
                const active = entry.href === activeHref;
                if (entry.action === "switch-mode")
                  return (
                    <li key={entry.id}>
                      <button
                        type="button"
                        onClick={() =>
                          window.dispatchEvent(
                            new CustomEvent("loyalflow:open-experience-mode"),
                          )
                        }
                        className="lf-nav-item flex min-h-11 w-full items-center gap-3 px-3 text-start text-sm font-semibold transition-colors"
                      >
                        <Icon size={18} aria-hidden="true" />
                        <span>{entry.label}</span>
                      </button>
                    </li>
                  );
                return (
                  <li key={entry.href}>
                    <Link
                      href={entry.href}
                      aria-current={active ? "page" : undefined}
                      className={`lf-nav-item flex min-h-11 items-center gap-3 px-3 text-sm font-semibold transition-colors ${active ? "lf-nav-item-active" : ""}`}
                    >
                      <span className="lf-nav-icon flex size-8 shrink-0 items-center justify-center rounded-lg">
                        <Icon size={17} aria-hidden="true" />
                      </span>
                      <span>{entry.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </nav>
      <div className="mx-5 border-t border-border/80 py-4 text-[11px] font-semibold text-foreground-subtle">
        LoyalFlow ·{" "}
        {platformWorkspace
          ? language === "AR"
            ? "إدارة منصة محمية"
            : "Protected platform administration"
          : language === "AR"
            ? "مساحة عمل آمنة"
            : "Secure workspace"}
      </div>
    </aside>
  );
}
