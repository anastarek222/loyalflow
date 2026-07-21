import Link from "next/link";

type AppSidebarProps = {
  language: "AR" | "EN";
};

export default function AppSidebar({
  language,
}: AppSidebarProps) {

  const items = [
    {
      label: language === "AR" ? "الرئيسية" : "Dashboard",
      href: "/dashboard",
      icon: "🏠",
    },
    {
      label: language === "AR" ? "الأنشطة" : "Businesses",
      href: "/businesses",
      icon: "🏢",
    },
    {
      label: language === "AR" ? "العملاء" : "Customers",
      href: "/customers",
      icon: "👥",
    },
    {
      label: language === "AR" ? "التقارير" : "Reports",
      href: "/reports",
      icon: "📊",
    },
    {
      label: language === "AR" ? "الإعدادات" : "Settings",
      href: "/settings",
      icon: "⚙️",
    },
  ];

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

        {items.map((item)=>(
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-xl px-4 py-3 font-bold text-slate-700 transition hover:bg-slate-100"
          >
            <span>
              {item.icon}
            </span>

            {item.label}
          </Link>
        ))}

      </nav>

    </aside>
  );
}
