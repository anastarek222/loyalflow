"use client";

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";

import MobileSidebar from "@/components/mobile-sidebar";
import type { ShellBusiness, ShellUser } from "@/lib/app-shell-navigation";
import type { ExperienceMode } from "@/lib/experience-mode";

type Props = {
  language: "AR" | "EN";
  experienceMode: ExperienceMode;
  user: ShellUser;
  business?: ShellBusiness;
  businesses: ShellBusiness[];
};

export default function MobileSidebarWrapper({ language, experienceMode, user, business, businesses }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const openNavigation = () => setOpen(true);
    window.addEventListener("loyalflow:open-navigation", openNavigation);
    return () => window.removeEventListener("loyalflow:open-navigation", openNavigation);
  }, []);

  return <>
    <button type="button" onClick={() => setOpen(true)} aria-label={language === "AR" ? "فتح القائمة" : "Open navigation"} className="flex size-11 items-center justify-center rounded-md text-slate-700 hover:bg-surface-subtle lg:hidden"><Menu aria-hidden="true" size={22} /></button>
    <MobileSidebar open={open} onClose={() => setOpen(false)} language={language} experienceMode={experienceMode} user={user} business={business} businesses={businesses} />
  </>;
}
