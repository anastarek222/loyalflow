"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  X,
  LayoutDashboard,
  Building2,
  Users,
  ScanLine,
  BarChart3,
  Settings,
  UserCog,
  GitBranch,
} from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  language: "AR" | "EN";
  businessSlug?: string;
  role?: string;
};

export default function MobileSidebar({
  open,
  onClose,
  language,
  businessSlug,
  role = "STAFF",
}: Props) {

  const pathname = usePathname();


  const items = [
    {
      label: language === "AR" ? "الرئيسية" : "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: language === "AR" ? "الأنشطة" : "Businesses",
      href: "/businesses",
      icon: Building2,
    },
    businessSlug && {
      label: language === "AR" ? "العملاء" : "Customers",
      href: `/businesses/${businessSlug}/customers`,
      icon: Users,
    },
    businessSlug && {
      label: language === "AR" ? "مسح الكارت" : "Scan QR",
      href: `/businesses/${businessSlug}/scan`,
      icon: ScanLine,
    },
    businessSlug && {
      label: language === "AR" ? "التقارير" : "Reports",
      href: `/businesses/${businessSlug}/reports`,
      icon: BarChart3,
    },
    role === "OWNER" && businessSlug && {
      label: language === "AR" ? "الفريق" : "Team",
      href: `/businesses/${businessSlug}/users`,
      icon: UserCog,
    },
    (role === "OWNER" || role === "SUPER_ADMIN") && businessSlug && {
      label: language === "AR" ? "الفروع" : "Branches",
      href: `/businesses/${businessSlug}/branches`,
      icon: GitBranch,
    },
    businessSlug && {
      label: language === "AR" ? "الإعدادات" : "Settings",
      href: `/businesses/${businessSlug}/settings`,
      icon: Settings,
    },
  ].filter(Boolean) as {
    label:string;
    href:string;
    icon: React.ElementType;
  }[];


  return (
    <>
      {open && (
        <div
          onClick={onClose}
          className="
            fixed
            inset-0
            z-40
            bg-slate-950/40
            backdrop-blur-sm
            transition-opacity
            lg:hidden
          "
        />
      )}


      <aside
        className={`fixed top-0 z-50 h-full w-72 border-slate-200 bg-white p-6 shadow-2xl transition-transform duration-300 lg:hidden ${
          language === "AR"
            ? "right-0"
            : "left-0"
        } ${
          open
            ? "translate-x-0"
            : language === "AR"
              ? "translate-x-full"
              : "-translate-x-full"
        }`}
      >

        <div className="mb-8 flex items-center justify-between">

          <div>
            <h1 className="text-2xl font-black text-slate-950">
              LoyalFlow
            </h1>

            <p className="mt-1 text-sm font-bold text-slate-500">
              Loyalty SaaS Platform
            </p>
          </div>


          <button
            onClick={onClose}
            className="rounded-xl p-2 hover:bg-slate-100"
          >
            <X size={22}/>
          </button>

        </div>


        <nav className="space-y-2">

          {items.map((item)=>{

            const Icon = item.icon;

            const active =
              pathname === item.href ||
              pathname.startsWith(item.href + "/");


            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 font-bold ${
                  active
                    ? "bg-slate-950 text-white"
                    : "hover:bg-slate-100"
                }`}
              >

                <Icon size={20}/>

                {item.label}

              </Link>
            );
          })}

        </nav>

      </aside>
    </>
  );
}
