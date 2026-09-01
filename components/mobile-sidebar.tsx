"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

import {
  buildShellNavigation,
  isNavigationItemActive,
  type ShellBusiness,
  type ShellUser,
} from "@/lib/app-shell-navigation";
import { PlatformBrandIdentity } from "@/components/platform-brand-identity";
import { icons } from "@/components/shell-icons";
import type { ExperienceMode } from "@/lib/experience-mode";
import { platformBrand } from "@/lib/platform-brand";

type Props = {
  open: boolean;
  onClose: () => void;
  language: "AR" | "EN";
  experienceMode: ExperienceMode;
  user: ShellUser;
  business?: ShellBusiness;
  businesses: ShellBusiness[];
};

export default function MobileSidebar({ open, onClose, language, experienceMode, user, business, businesses }: Props) {
  const pathname = usePathname();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [businessQuery, setBusinessQuery] = useState("");
  const shouldShowBusinessSearch = businesses.length >= 7;
  const visibleBusinesses = businesses.filter((candidate) =>
    candidate.name.toLocaleLowerCase().includes(businessQuery.trim().toLocaleLowerCase()),
  );

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { onClose(); return; }
      if (event.key !== "Tab") return;
      const drawer = closeRef.current?.closest("aside");
      const items = drawer ? Array.from(drawer.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')) : [];
      if (!items.length) { event.preventDefault(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKeydown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKeydown); previousFocus?.focus(); };
  }, [onClose, open]);

  const groups = buildShellNavigation({ language, user, business, experienceMode });
  if (!open) return null;
  return createPortal(<>
    <button type="button" aria-label={language === "AR" ? "إغلاق القائمة" : "Close navigation"} onClick={onClose} className="fixed inset-0 z-[80] cursor-default bg-foreground/60 lg:hidden" />
    <aside role="dialog" aria-modal="true" aria-label={language === "AR" ? "قائمة التنقل" : "Navigation menu"} className="lf-nav-sidebar fixed inset-y-0 start-0 z-[90] flex h-[100dvh] w-80 max-w-[calc(100vw-2rem)] flex-col border-e bg-surface shadow-[var(--lf-shadow-overlay)] lg:hidden">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <div className="flex items-center">
            <PlatformBrandIdentity
              fallback="letters"
              fallbackText={platformBrand.name}
              markClassName="hidden"
              wordmarkClassName="h-5 max-w-32"
              textClassName="font-black text-foreground"
            />
          </div>
          <p className="text-xs text-foreground-subtle">{business?.name ?? (language === "AR" ? "مساحة العمل" : "Workspace")}</p>
        </div>
        <button ref={closeRef} type="button" aria-label={language === "AR" ? "إغلاق القائمة" : "Close navigation"} onClick={onClose} className="flex size-11 items-center justify-center rounded-[var(--lf-radius-input)] text-foreground-muted hover:bg-surface-subtle"><X aria-hidden="true" /></button>
      </header>
      {business && businesses.length > 1 && <section aria-labelledby="mobile-business-switcher-title" className="shrink-0 border-b border-border px-4 py-3">
        <div className="flex items-baseline justify-between gap-3"><p id="mobile-business-switcher-title" className="text-xs font-semibold text-foreground-subtle">{language === "AR" ? "تبديل النشاط" : "Switch business"}</p><p className="max-w-40 truncate text-xs font-semibold text-primary">{business.name}</p></div>
        {shouldShowBusinessSearch && <label className="mt-2 block"><span className="sr-only">{language === "AR" ? "البحث عن نشاط" : "Search businesses"}</span><input type="search" value={businessQuery} onChange={(event) => setBusinessQuery(event.target.value)} placeholder={language === "AR" ? "البحث عن نشاط" : "Search businesses"} className="min-h-10 w-full rounded-[var(--lf-radius-input)] border border-border px-3 text-sm" /></label>}
        <ul className="mt-2 max-h-48 overflow-y-auto overscroll-contain pe-1" aria-label={language === "AR" ? "قائمة الأنشطة" : "Business list"}>
          {visibleBusinesses.map((candidate) => <li key={candidate.id}><Link href={`/businesses/${candidate.slug}`} onClick={onClose} aria-current={candidate.slug === business.slug ? "page" : undefined} className={`flex min-h-11 items-center rounded-[var(--lf-radius-input)] px-3 text-sm font-semibold ${candidate.slug === business.slug ? "bg-primary-subtle text-primary" : "text-foreground-muted hover:bg-surface-subtle"}`}><span className="truncate">{candidate.name}</span></Link></li>)}
          {!visibleBusinesses.length && <li className="px-3 py-2 text-sm text-foreground-subtle">{language === "AR" ? "لا توجد نتائج" : "No businesses found"}</li>}
        </ul>
      </section>}
      <nav className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {groups.map((group) => <section key={group.id} className="mb-6 last:mb-0">
          {group.label && <h2 className="lf-nav-group-label mb-2 px-4">{group.label}</h2>}
          <ul className="space-y-1">{group.items.map((entry) => {
            const Icon = icons[entry.icon];
            const active = isNavigationItemActive(pathname, entry.href);
            if (entry.action === "switch-mode") return <li key={entry.id}><button type="button" onClick={() => { onClose(); window.dispatchEvent(new CustomEvent("loyalflow:open-experience-mode")); }} className="lf-nav-item flex min-h-11 w-full items-center gap-4 px-4 text-start text-sm font-semibold"><Icon size={18} aria-hidden="true" />{entry.label}</button></li>;
            return <li key={entry.href}><Link href={entry.href} onClick={onClose} aria-current={active ? "page" : undefined} className={`lf-nav-item flex min-h-11 items-center gap-4 px-4 text-sm font-semibold ${active ? "lf-nav-item-active" : ""}`}><Icon size={18} aria-hidden="true" />{entry.label}</Link></li>;
          })}</ul>
        </section>)}
      </nav>
    </aside>
  </>, document.body);
}
