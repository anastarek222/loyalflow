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
    businessSlug
      ? {
          label:
            language === "AR"
              ? "العملاء"
              : "Customers",
          href: `/businesses/${businessSlug}/customers`,
          icon: Users,
        }
      : null,
    businessSlug
      ? {
          label:
            language === "AR"
              ? "مسح الكارت"
              : "Scan QR",
          href: `/businesses/${businessSlug}/scan`,
          icon: ScanLine,
        }
      : null,
    businessSlug
      ? {
          label:
            language === "AR"
              ? "التقارير"
              : "Reports",
          href: `/businesses/${businessSlug}/reports`,
          icon: BarChart3,
        }
      : null,
    role === "OWNER" && businessSlug
      ? {
          label:
            language === "AR"
              ? "إدارة الفريق"
              : "Team",
          href: `/businesses/${businessSlug}/users`,
          icon: UserCog,
        }
      : null,
    businessSlug
      ? {
          label:
            language === "AR"
              ? "الإعدادات"
              : "Settings",
          href: `/businesses/${businessSlug}/settings`,
          icon: Settings,
        }
      : null,
  ].filter(Boolean) as {
    label: string;
    href: string;
    icon: React.ElementType;
  }[];

  return (
    <aside className="hidden min-h-screen w-72 border-r border-slate-200 bg-white p-6 lg:block">

      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-950">
          LoyalFlow
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Loyalty SaaS Platform
        </p>
      </div>


      <nav className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;

          const active =
            pathname === item.href ||
            pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 font-bold transition ${
                active
                  ? "bg-slate-950 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Icon size={20} />

              {item.label}
            </Link>
          );
        })}
      </nav>

    </aside>
  );
}
