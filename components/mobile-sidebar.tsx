"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

import {
  buildShellNavigation,
  isNavigationItemActive,
  type ShellBusiness,
  type ShellUser,
} from "@/lib/app-shell-navigation";
import { icons } from "@/components/shell-icons";

type Props = {
  open: boolean;
  onClose: () => void;
  language: "AR" | "EN";
  user: ShellUser;
  business?: ShellBusiness;
  businesses: ShellBusiness[];
};

export default function MobileSidebar({ open, onClose, language, user, business, businesses }: Props) {
  const pathname = usePathname();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeydown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeydown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKeydown); previousFocus?.focus(); };
  }, [onClose, open]);

  const groups = buildShellNavigation({ language, user, business });
  return <>
    {open && <button type="button" aria-label={language === "AR" ? "إغلاق القائمة" : "Close navigation"} onClick={onClose} className="fixed inset-0 z-40 cursor-default bg-slate-950/45 lg:hidden" />}
    <aside role="dialog" aria-modal="true" aria-label={language === "AR" ? "قائمة التنقل" : "Navigation menu"} className={`lf-nav-sidebar fixed top-0 z-50 flex h-[100dvh] w-80 max-w-[calc(100vw-2rem)] flex-col border-e shadow-[var(--lf-shadow-overlay)] transition-transform duration-200 lg:hidden ${language === "AR" ? "right-0" : "left-0"} ${open ? "translate-x-0" : language === "AR" ? "translate-x-full" : "-translate-x-full"}`}>
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <div><p className="font-black text-slate-950">LoyalFlow</p><p className="text-xs text-slate-500">{business?.name ?? (language === "AR" ? "مساحة العمل" : "Workspace")}</p></div>
        <button ref={closeRef} type="button" aria-label={language === "AR" ? "إغلاق القائمة" : "Close navigation"} onClick={onClose} className="flex size-11 items-center justify-center rounded-md text-slate-700 hover:bg-surface-subtle"><X aria-hidden="true" /></button>
      </header>
      {business && businesses.length > 1 && <div className="border-b border-border px-4 py-3"><p className="mb-2 text-xs font-semibold text-slate-500">{language === "AR" ? "تبديل النشاط" : "Switch business"}</p><div className="flex flex-wrap gap-1">{businesses.map((candidate) => <Link key={candidate.id} href={`/businesses/${candidate.slug}`} onClick={onClose} className={`rounded-md px-2 py-1.5 text-xs font-semibold ${candidate.slug === business.slug ? "bg-indigo-50 text-primary" : "text-slate-600 hover:bg-surface-subtle"}`}>{candidate.name}</Link>)}</div></div>}
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {groups.map((group) => <section key={group.id} className="mb-5 last:mb-0">
          {group.label && <h2 className="lf-nav-group-label mb-2 px-3">{group.label}</h2>}
          <ul className="space-y-1">{group.items.map((entry) => {
            const Icon = icons[entry.icon];
            const active = isNavigationItemActive(pathname, entry.href);
            return <li key={entry.href}><Link href={entry.href} onClick={onClose} aria-current={active ? "page" : undefined} className={`lf-nav-item flex min-h-11 items-center gap-3 px-3 text-sm font-semibold ${active ? "lf-nav-item-active" : ""}`}><Icon size={18} aria-hidden="true" />{entry.label}</Link></li>;
          })}</ul>
        </section>)}
      </nav>
    </aside>
  </>;
}
