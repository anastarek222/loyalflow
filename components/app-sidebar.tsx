"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
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

type Props = {
  language: "AR" | "EN";
  user: ShellUser;
  business?: ShellBusiness;
};

const icons: Record<ShellNavigationItem["icon"], React.ElementType> = {
  overview: LayoutDashboard,
  businesses: Building2,
  scan: ScanLine,
  customers: Users,
  activity: Radio,
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

export default function AppSidebar({ language, user, business }: Props) {
  const pathname = usePathname();
  const groups = buildShellNavigation({ language, user, business });

  return (
    <aside className="lf-nav-sidebar sticky top-0 hidden h-screen w-72 shrink-0 border-e lg:flex lg:flex-col" aria-label={language === "AR" ? "التنقل الرئيسي" : "Primary navigation"}>
      <div className="border-b border-border px-5 py-5">
        <Link href="/dashboard" className="flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lf-focus)]">
          <span className="flex size-10 items-center justify-center rounded-md bg-slate-950 text-lg font-black text-white">L</span>
          <span><span className="block text-lg font-black text-slate-950">LoyalFlow</span><span className="block text-xs font-medium text-slate-500">Loyalty operations</span></span>
        </Link>
      </div>
      {business && (
        <div className="border-b border-border px-5 py-4" data-current-business-context="true">
          <p className="text-xs font-semibold text-slate-500">{language === "AR" ? "النشاط الحالي" : "Current business"}</p>
          <p className="mt-1 truncate font-bold text-slate-950" title={business.name}>{business.name}</p>
        </div>
      )}
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {groups.map((group) => <section key={group.id} className="mb-5 last:mb-0">
          {group.label && <h2 className="lf-nav-group-label mb-2 px-3">{group.label}</h2>}
          <ul className="space-y-1">
            {group.items.map((entry) => {
              const Icon = icons[entry.icon];
              const active = isNavigationItemActive(pathname, entry.href);
              return <li key={entry.href}><Link href={entry.href} aria-current={active ? "page" : undefined} className={`lf-nav-item flex min-h-11 items-center gap-3 px-3 text-sm font-semibold transition-colors ${active ? "lf-nav-item-active" : ""}`}><Icon size={18} aria-hidden="true" /><span>{entry.label}</span></Link></li>;
            })}
          </ul>
        </section>)}
      </nav>
      <div className="border-t border-border px-5 py-4 text-xs text-slate-500">LoyalFlow</div>
    </aside>
  );
}
