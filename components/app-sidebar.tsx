"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  LayoutDashboard,
  Building2,
  Users,
  ScanLine,
  BarChart3,
  Settings,
  UserCog,
  GitBranch,
} from "lucide-react";


type AppSidebarProps = {
  language: "AR" | "EN";
  businessSlug?: string;
  role?: string;
};


export default function AppSidebar({
  language,
  businessSlug,
  role = "STAFF",
}: AppSidebarProps) {

  const pathname = usePathname();


  const items = [
    {
      label:
        language === "AR"
          ? "الرئيسية"
          : "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },

    {
      label:
        language === "AR"
          ? "الأنشطة"
          : "Businesses",
      href: "/businesses",
      icon: Building2,
    },

    businessSlug && {
      label:
        language === "AR"
          ? "العملاء"
          : "Customers",
      href: `/businesses/${businessSlug}/customers`,
      icon: Users,
    },

    businessSlug && {
      label:
        language === "AR"
          ? "مسح QR"
          : "Scan QR",
      href: `/businesses/${businessSlug}/scan`,
      icon: ScanLine,
    },

    businessSlug && {
      label:
        language === "AR"
          ? "التقارير"
          : "Reports",
      href: `/businesses/${businessSlug}/reports`,
      icon: BarChart3,
    },

    role === "OWNER" &&
      businessSlug && {
        label:
          language === "AR"
            ? "الفريق"
            : "Team",
        href:
          `/businesses/${businessSlug}/users`,
        icon: UserCog,
      },

    (role === "OWNER" || role === "SUPER_ADMIN") &&
      businessSlug && {
        label:
          language === "AR"
            ? "الفروع"
            : "Branches",
        href: `/businesses/${businessSlug}/branches`,
        icon: GitBranch,
      },

    businessSlug && {
      label:
        language === "AR"
          ? "الإعدادات"
          : "Settings",
      href:
        `/businesses/${businessSlug}/settings`,
      icon: Settings,
    },

  ].filter(Boolean) as {
    label:string;
    href:string;
    icon:React.ElementType;
  }[];



  return (

    <aside
      className="
        hidden
        min-h-screen
        w-72
        border-r
        border-slate-200
        bg-white
        px-5
        py-6
        lg:block
      "
    >


      {/* Brand */}

      <div className="mb-8">

        <div className="flex items-center gap-3">

          <div
            className="
              flex
              h-11
              w-11
              items-center
              justify-center
              rounded-2xl
              bg-slate-950
              text-lg
              font-black
              text-white
            "
          >
            L
          </div>


          <div>

            <h1 className="text-xl font-black text-slate-950">
              LoyalFlow
            </h1>

            <p className="text-xs font-bold text-slate-500">
              Loyalty SaaS
            </p>

          </div>

        </div>

      </div>



      {/* Workspace */}

      <div
        className="
          mb-7
          rounded-2xl
          border
          border-slate-200
          bg-slate-50
          p-4
        "
      >

        <p className="text-xs font-bold text-slate-500">
          {language === "AR"
            ? "مساحة العمل"
            : "Workspace"}
        </p>


        <p className="mt-1 font-black text-slate-950">
          LoyalFlow
        </p>

      </div>



      <p className="mb-3 px-2 text-xs font-black uppercase text-slate-400">
        {language === "AR"
          ? "القائمة"
          : "Menu"}
      </p>



      <nav className="space-y-1">

        {items.map((item)=>{

          const Icon = item.icon;


          const active =
            pathname === item.href ||
            pathname.startsWith(
              item.href + "/"
            );


          return (

            <Link
              key={item.href}
              href={item.href}
              className={`
                group
                flex
                items-center
                gap-3
                rounded-2xl
                px-4
                py-3
                font-bold
                transition-all
                ${
                  active
                    ? `
                      bg-slate-950
                      text-white
                      shadow-lg
                    `
                    :
                      `
                      text-slate-700
                      hover:bg-slate-100
                    `
                }
              `}
            >

              <Icon
                size={20}
                className={
                  active
                    ? "text-white"
                    : "text-slate-500 group-hover:text-slate-950"
                }
              />


              {item.label}

            </Link>

          );

        })}

      </nav>


    </aside>

  );
}
