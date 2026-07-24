"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Building2, ChevronDown, LogOut, ScanLine } from "lucide-react";

import LanguageSwitcher from "@/components/language-switcher";
import ExperienceModeSwitcher from "@/components/experience-mode-switcher";
import MobileSidebarWrapper from "@/components/mobile-sidebar-wrapper";
import { Avatar } from "@/components/ui/surface";
import { logoutAction } from "@/app/dashboard/actions";
import {
  buildShellNavigation,
  getShellPageContext,
  type ShellBusiness,
  type ShellUser,
} from "@/lib/app-shell-navigation";
import {
  getExperienceNavigationRules,
  type ExperienceAccess,
  type ExperienceMode,
} from "@/lib/experience-mode";

type Props = {
  language: "AR" | "EN";
  experienceMode: ExperienceMode;
  experienceAccess: ExperienceAccess;
  activeBusiness?: ShellBusiness;
  businesses: ShellBusiness[];
  user: ShellUser & { firstName: string; lastName: string; email: string };
};

function roleLabel(role: string, language: "AR" | "EN") {
  const labels = {
    AR: { OWNER: "مالك النشاط", MANAGER: "مدير", STAFF: "موظف", VIEWER: "مشاهد", SUPER_ADMIN: "مدير النظام" },
    EN: { OWNER: "Owner", MANAGER: "Manager", STAFF: "Staff", VIEWER: "Viewer", SUPER_ADMIN: "Super admin" },
  } as const;
  return labels[language][role as keyof typeof labels.EN] ?? role;
}

export default function AppTopbar({ language, experienceMode, experienceAccess, user, businesses, activeBusiness }: Props) {
  const pathname = usePathname();
  const [accountOpen, setAccountOpen] = useState(false);
  const [businessOpen, setBusinessOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const businessRef = useRef<HTMLDivElement>(null);
  const fullName = `${user.firstName} ${user.lastName}`.trim();
  const context = getShellPageContext(pathname, language, activeBusiness);
  const advancedEntries = activeBusiness
    ? buildShellNavigation({ language, user, business: activeBusiness, experienceMode: "ADVANCED" }).flatMap((group) => group.items)
    : [];
  const canScan = advancedEntries.some((entry) => entry.id === "scan");
  const modeRules = getExperienceNavigationRules({
    mode: experienceMode,
    role: user.role,
    access: experienceAccess,
    advancedDestinationCount: advancedEntries.filter((entry) => !["overview", "scan", "customers", "activity", "businesses"].includes(entry.id)).length,
  });

  useEffect(() => {
    function closeWhenOutside(event: MouseEvent) {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false);
      if (!businessRef.current?.contains(event.target as Node)) setBusinessOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) { if (event.key === "Escape") { setAccountOpen(false); setBusinessOpen(false); } }
    document.addEventListener("mousedown", closeWhenOutside);
    window.addEventListener("keydown", closeOnEscape);
    const openExperienceMode = () => setAccountOpen(true);
    window.addEventListener("loyalflow:open-experience-mode", openExperienceMode);
    return () => { document.removeEventListener("mousedown", closeWhenOutside); window.removeEventListener("keydown", closeOnEscape); window.removeEventListener("loyalflow:open-experience-mode", openExperienceMode); };
  }, []);

  return <header className="lf-topbar sticky top-0 z-20 flex min-h-16 items-center justify-between gap-3 border-b px-3 py-2 sm:px-6" data-shell-topbar="true">
    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
      <MobileSidebarWrapper language={language} experienceMode={experienceMode} user={{ ...user, experienceAccess }} business={activeBusiness} businesses={businesses} />
      <div className="min-w-0">
        {context.parent && <p className="truncate text-xs font-medium text-slate-500">{context.parent}</p>}
        <p className="truncate text-base font-bold text-slate-950 sm:text-lg">{context.title}</p>
      </div>
      {activeBusiness && <div ref={businessRef} className="relative hidden sm:block" data-current-business-context="true">
        {businesses.length > 1 ? <button type="button" aria-expanded={businessOpen} aria-haspopup="menu" onClick={() => setBusinessOpen((value) => !value)} className="flex min-h-11 max-w-52 items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold text-slate-700 hover:bg-surface-subtle"><Building2 size={16} aria-hidden="true" /><span className="truncate">{activeBusiness.name}</span><ChevronDown size={15} aria-hidden="true" /></button> : <span className="inline-flex min-h-11 max-w-52 items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold text-slate-700"><Building2 size={16} aria-hidden="true" /><span className="truncate">{activeBusiness.name}</span></span>}
        {businessOpen && <div role="menu" aria-label={language === "AR" ? "تبديل النشاط" : "Switch business"} className="absolute start-0 top-12 z-50 w-64 rounded-md border border-border bg-surface p-1 shadow-[var(--lf-shadow-overlay)]">{businesses.map((business) => <Link key={business.id} href={`/businesses/${business.slug}`} role="menuitem" onClick={() => setBusinessOpen(false)} className={`flex min-h-11 items-center rounded-md px-3 text-sm font-semibold ${business.slug === activeBusiness.slug ? "bg-indigo-50 text-primary" : "text-slate-700 hover:bg-surface-subtle"}`}>{business.name}</Link>)}</div>}
      </div>}
    </div>
    <div className="flex shrink-0 items-center gap-1 sm:gap-2">
      {activeBusiness && canScan && <Link href={`/businesses/${activeBusiness.slug}/scan`} aria-label={language === "AR" ? "فتح المسح" : "Open scan"} className="hidden min-h-11 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-white hover:bg-primary-hover sm:inline-flex"><ScanLine size={17} aria-hidden="true" /><span>{language === "AR" ? "مسح" : "Scan"}</span></Link>}
      {activeBusiness && <Link href={`/businesses/${activeBusiness.slug}?notifications=1`} aria-label={language === "AR" ? "الإشعارات" : "Notifications"} className="flex size-11 items-center justify-center rounded-md text-slate-700 hover:bg-surface-subtle"><Bell size={19} aria-hidden="true" /></Link>}
      <LanguageSwitcher language={language} />
      <div ref={accountRef} className="relative">
        <button type="button" aria-expanded={accountOpen} aria-haspopup="menu" aria-label={language === "AR" ? "قائمة الحساب" : "Account menu"} onClick={() => setAccountOpen((value) => !value)} className="flex min-h-11 items-center gap-2 rounded-md px-1.5 hover:bg-surface-subtle"><Avatar name={fullName || user.email} className="bg-slate-950 text-white" /><ChevronDown className="hidden text-slate-500 sm:block" size={16} aria-hidden="true" /></button>
        {accountOpen && <div role="menu" aria-label={language === "AR" ? "الحساب" : "Account"} className="absolute end-0 top-12 z-50 w-72 rounded-md border border-border bg-surface p-2 shadow-[var(--lf-shadow-overlay)]"><div className="border-b border-border px-3 py-2"><p className="font-semibold text-slate-950">{fullName || "User"}</p><p dir="ltr" className="mt-0.5 truncate text-sm text-slate-500">{user.email}</p><p className="mt-1 text-xs font-semibold text-slate-600">{roleLabel(user.role, language)}</p></div>{modeRules.showModeSwitcher ? <ExperienceModeSwitcher language={language} mode={experienceMode} access={experienceAccess} /> : null}<div className="pt-1">{user.role === "SUPER_ADMIN" && <Link href="/businesses" role="menuitem" onClick={() => setAccountOpen(false)} className="flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold text-slate-700 hover:bg-surface-subtle"><Building2 size={16} aria-hidden="true" />{language === "AR" ? "الأنشطة التجارية" : "Businesses"}</Link>}<form action={logoutAction}><button type="submit" role="menuitem" className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-sm font-semibold text-danger hover:bg-surface-subtle"><LogOut size={16} aria-hidden="true" />{language === "AR" ? "تسجيل الخروج" : "Log out"}</button></form></div></div>}
      </div>
    </div>
  </header>;
}
