"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Building2,
  ChevronDown,
  KeyRound,
  LogOut,
  ScanLine,
} from "lucide-react";

import LanguageSwitcher from "@/components/language-switcher";
import ExperienceModeSwitcher from "@/components/experience-mode-switcher";
import MobileSidebarWrapper from "@/components/mobile-sidebar-wrapper";
import { Avatar } from "@/components/ui/avatar";
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
    AR: {
      OWNER: "مالك النشاط",
      MANAGER: "مدير",
      STAFF: "موظف",
      VIEWER: "مشاهد",
      SUPER_ADMIN: "مدير النظام",
    },
    EN: {
      OWNER: "Owner",
      MANAGER: "Manager",
      STAFF: "Staff",
      VIEWER: "Viewer",
      SUPER_ADMIN: "Super admin",
    },
  } as const;
  return labels[language][role as keyof typeof labels.EN] ?? role;
}

function handlePopoverEscape(
  event: React.KeyboardEvent<HTMLDivElement>,
  onClose: () => void,
  trigger: HTMLButtonElement | null,
) {
  if (event.key !== "Escape") return;
  event.preventDefault();
  event.stopPropagation();
  onClose();
  trigger?.focus();
}

export default function AppTopbar({
  language,
  experienceMode,
  experienceAccess,
  user,
  businesses,
  activeBusiness,
}: Props) {
  const pathname = usePathname();
  const [accountOpen, setAccountOpen] = useState(false);
  const [businessOpen, setBusinessOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const businessRef = useRef<HTMLDivElement>(null);
  const accountButtonRef = useRef<HTMLButtonElement>(null);
  const businessButtonRef = useRef<HTMLButtonElement>(null);
  const fullName = `${user.firstName} ${user.lastName}`.trim();
  const context = getShellPageContext(pathname, language, activeBusiness);
  const platformWorkspace = user.role === "SUPER_ADMIN" && !activeBusiness;
  const advancedEntries = activeBusiness
    ? buildShellNavigation({
        language,
        user,
        business: activeBusiness,
        experienceMode: "ADVANCED",
      }).flatMap((group) => group.items)
    : [];
  const canScan = advancedEntries.some((entry) => entry.id === "scan");
  const modeRules = getExperienceNavigationRules({
    mode: experienceMode,
    role: user.role,
    access: experienceAccess,
    advancedDestinationCount: advancedEntries.filter(
      (entry) =>
        !["overview", "scan", "customers", "activity", "businesses"].includes(
          entry.id,
        ),
    ).length,
  });

  useEffect(() => {
    function closeWhenOutside(event: MouseEvent) {
      if (!accountRef.current?.contains(event.target as Node))
        setAccountOpen(false);
      if (!businessRef.current?.contains(event.target as Node))
        setBusinessOpen(false);
    }
    document.addEventListener("mousedown", closeWhenOutside);
    const openExperienceMode = () => setAccountOpen(true);
    window.addEventListener(
      "loyalflow:open-experience-mode",
      openExperienceMode,
    );
    return () => {
      document.removeEventListener("mousedown", closeWhenOutside);
      window.removeEventListener(
        "loyalflow:open-experience-mode",
        openExperienceMode,
      );
    };
  }, []);

  return (
    <header
      className="lf-topbar sticky top-0 z-20 flex min-h-16 items-center justify-between gap-2 border-b px-3 py-2.5 sm:gap-4 sm:px-6 lg:px-8 xl:px-10"
      data-shell-topbar="true"
      data-platform-topbar={platformWorkspace ? "true" : undefined}
    >
      <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-4">
        <MobileSidebarWrapper
          language={language}
          experienceMode={experienceMode}
          user={{ ...user, experienceAccess }}
          business={activeBusiness}
          businesses={businesses}
        />
        <div className="min-w-0">
          {platformWorkspace && !context.parent ? (
            <p className="hidden truncate text-[11px] font-bold uppercase tracking-[0.08em] text-primary/70 sm:block">
              {language === "AR" ? "إدارة المنصة" : "Platform administration"}
            </p>
          ) : null}
          {context.parent && (
            <p className="hidden truncate text-[11px] font-bold uppercase tracking-[0.08em] text-primary/70 sm:block">
              {context.parent}
            </p>
          )}
          <p className="truncate text-base font-bold tracking-[-0.01em] text-foreground sm:text-lg">
            {context.title}
          </p>
        </div>
        {activeBusiness && businesses.length > 1 && (
          <div
            ref={businessRef}
            className="relative hidden sm:block"
            data-current-business-context="true"
          >
            <button
              ref={businessButtonRef}
              type="button"
              aria-expanded={businessOpen}
              aria-controls="topbar-business-popover"
              onClick={() => setBusinessOpen((value) => !value)}
              className="flex min-h-10 max-w-52 items-center gap-2 rounded-[var(--lf-radius-input)] border border-border bg-surface/80 px-3 text-sm font-semibold text-foreground-muted shadow-[var(--lf-shadow-raised)] transition hover:border-primary/30 hover:bg-surface"
            >
              <Building2 size={16} aria-hidden="true" />
              <span className="truncate">{activeBusiness.name}</span>
              <ChevronDown size={15} aria-hidden="true" />
            </button>
            {businessOpen && (
              <div
                id="topbar-business-popover"
                aria-label={
                  language === "AR" ? "تبديل النشاط" : "Switch business"
                }
                onKeyDown={(event) =>
                  handlePopoverEscape(
                    event,
                    () => setBusinessOpen(false),
                    businessButtonRef.current,
                  )
                }
                className="absolute start-0 top-12 z-50 w-64 rounded-[var(--lf-radius-input)] border border-border bg-surface p-1 shadow-[var(--lf-shadow-overlay)]"
              >
                {businesses.map((business) => (
                  <Link
                    key={business.id}
                    href={`/businesses/${business.slug}`}
                    onClick={() => setBusinessOpen(false)}
                    className={`flex min-h-11 items-center rounded-[var(--lf-radius-input)] px-4 text-sm font-semibold ${business.slug === activeBusiness.slug ? "bg-[var(--lf-primary-soft)] text-primary" : "text-foreground-muted hover:bg-surface-subtle"}`}
                  >
                    {business.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-0 sm:gap-2">
        {activeBusiness && canScan && (
          <Link
            href={`/businesses/${activeBusiness.slug}/scan`}
            aria-label={language === "AR" ? "فتح المسح" : "Open scan"}
            className="hidden min-h-11 items-center gap-2 rounded-[var(--lf-radius-input)] bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition hover:bg-primary-hover hover:shadow-md sm:inline-flex"
          >
            <ScanLine size={17} aria-hidden="true" />
            <span>{language === "AR" ? "مسح" : "Scan"}</span>
          </Link>
        )}
        {activeBusiness && (
          <Link
            href={`/businesses/${activeBusiness.slug}?notifications=1`}
            aria-label={language === "AR" ? "الإشعارات" : "Notifications"}
            className="flex size-11 items-center justify-center rounded-[var(--lf-radius-input)] border border-transparent text-foreground-muted transition hover:border-border hover:bg-surface hover:shadow-sm"
          >
            <Bell size={19} aria-hidden="true" />
          </Link>
        )}
        <LanguageSwitcher language={language} />
        <div ref={accountRef} className="relative">
          <button
            ref={accountButtonRef}
            type="button"
            aria-expanded={accountOpen}
            aria-controls="topbar-account-popover"
            aria-label={language === "AR" ? "قائمة الحساب" : "Account menu"}
            onClick={() => setAccountOpen((value) => !value)}
            className="flex min-h-11 items-center gap-2 rounded-[var(--lf-radius-input)] px-1.5 hover:bg-surface-subtle"
          >
            <Avatar
              name={fullName || user.email}
              className="bg-primary text-primary-foreground"
            />
            <ChevronDown
              className="hidden text-foreground-subtle sm:block"
              size={16}
              aria-hidden="true"
            />
          </button>
          {accountOpen && (
            <div
              id="topbar-account-popover"
              aria-label={language === "AR" ? "الحساب" : "Account"}
              onKeyDown={(event) =>
                handlePopoverEscape(
                  event,
                  () => setAccountOpen(false),
                  accountButtonRef.current,
                )
              }
              className="absolute end-0 top-12 z-50 w-72 rounded-[var(--lf-radius-input)] border border-border bg-surface p-2 shadow-[var(--lf-shadow-overlay)]"
            >
              <div className="border-b border-border px-4 py-2">
                <p className="font-semibold text-foreground">
                  {fullName || "User"}
                </p>
                <p
                  dir="ltr"
                  className="mt-0.5 truncate text-sm text-foreground-subtle"
                >
                  {user.email}
                </p>
                <p className="mt-1 text-xs font-semibold text-foreground-muted">
                  {roleLabel(user.role, language)}
                </p>
              </div>
              {modeRules.showModeSwitcher ? (
                <ExperienceModeSwitcher
                  language={language}
                  mode={experienceMode}
                  access={experienceAccess}
                />
              ) : null}
              <div className="pt-1">
                <Link
                  href="/account/security"
                  onClick={() => setAccountOpen(false)}
                  className="flex min-h-11 items-center gap-2 rounded-[var(--lf-radius-input)] px-4 text-sm font-semibold text-foreground-muted hover:bg-surface-subtle"
                >
                  <KeyRound size={16} aria-hidden="true" />
                  {language === "AR" ? "أمان الحساب" : "Account security"}
                </Link>
                {user.role === "SUPER_ADMIN" && (
                  <>
                    <Link
                      href="/businesses"
                      onClick={() => setAccountOpen(false)}
                      className="flex min-h-11 items-center gap-2 rounded-[var(--lf-radius-input)] px-4 text-sm font-semibold text-foreground-muted hover:bg-surface-subtle"
                    >
                      <Building2 size={16} aria-hidden="true" />
                      {language === "AR" ? "الأنشطة التجارية" : "Businesses"}
                    </Link>
                    <Link
                      href="/business-owners"
                      onClick={() => setAccountOpen(false)}
                      className="flex min-h-11 items-center gap-2 rounded-[var(--lf-radius-input)] px-4 text-sm font-semibold text-foreground-muted hover:bg-surface-subtle"
                    >
                      <Building2 size={16} aria-hidden="true" />
                      {language === "AR" ? "ملاك الأنشطة" : "Business owners"}
                    </Link>
                  </>
                )}
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="flex min-h-11 w-full items-center gap-2 rounded-[var(--lf-radius-input)] px-4 text-sm font-semibold text-danger hover:bg-surface-subtle"
                  >
                    <LogOut size={16} aria-hidden="true" />
                    {language === "AR" ? "تسجيل الخروج" : "Log out"}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
