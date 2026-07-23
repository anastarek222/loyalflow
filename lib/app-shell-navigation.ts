import type { UserRole } from "@/generated/prisma/client";

import { canPerform, type TenantUser } from "@/lib/permissions";

export type ShellBusiness = {
  id: string;
  name: string;
  slug: string;
};

export type ShellUser = TenantUser & {
  role: UserRole;
};

export type ShellNavigationItem = {
  id: NavigationId;
  label: string;
  href: string;
  icon:
    | "overview"
    | "businesses"
    | "scan"
    | "customers"
    | "activity"
    | "rewards"
    | "offers"
    | "campaigns"
    | "recovery"
    | "reports"
    | "staffReports"
    | "team"
    | "branches"
    | "settings"
    | "duplicates"
    | "playbooks";
};

type NavigationId =
  | "overview"
  | "businesses"
  | "scan"
  | "customers"
  | "activity"
  | "rewards"
  | "offers"
  | "campaigns"
  | "recovery"
  | "reports"
  | "staffReports"
  | "team"
  | "branches"
  | "settings"
  | "duplicates"
  | "playbooks";

export type ShellNavigationGroup = {
  id: string;
  label?: string;
  items: ShellNavigationItem[];
};

const labels = {
  AR: {
    overview: "الرئيسية",
    businesses: "الأنشطة التجارية",
    operations: "العمليات",
    growth: "النمو",
    analytics: "التحليلات",
    administration: "الإدارة",
    scan: "المسح",
    customers: "العملاء",
    activity: "النشاط",
    rewards: "المكافآت",
    offers: "العروض",
    campaigns: "الحملات",
    recovery: "الاستعادة",
    reports: "التقارير",
    staffReports: "تقارير الموظفين",
    team: "الفريق",
    branches: "الفروع",
    settings: "الإعدادات",
    duplicates: "السجلات المكررة",
    playbooks: "دليل الإعداد",
  },
  EN: {
    overview: "Overview",
    businesses: "Businesses",
    operations: "Operations",
    growth: "Growth",
    analytics: "Analytics",
    administration: "Administration",
    scan: "Scan",
    customers: "Customers",
    activity: "Activity",
    rewards: "Rewards",
    offers: "Offers",
    campaigns: "Campaigns",
    recovery: "Recovery",
    reports: "Reports",
    staffReports: "Staff reports",
    team: "Team",
    branches: "Branches",
    settings: "Settings",
    duplicates: "Duplicates",
    playbooks: "Setup playbooks",
  },
} as const;

type BuildNavigationInput = {
  language: "AR" | "EN";
  user: ShellUser;
  business?: ShellBusiness;
};

function item(
  language: "AR" | "EN",
  id: NavigationId,
  href: string,
): ShellNavigationItem {
  return { id, href, icon: id, label: labels[language][id] };
}

export function buildShellNavigation({
  language,
  user,
  business,
}: BuildNavigationInput): ShellNavigationGroup[] {
  const globalItems = [item(language, "overview", "/dashboard")];

  if (user.role === "SUPER_ADMIN") {
    globalItems.push(item(language, "businesses", "/businesses"));
  }

  if (!business) {
    return [{ id: "global", items: globalItems }];
  }

  const root = `/businesses/${business.slug}`;
  const can = (capability: Parameters<typeof canPerform>[2]) =>
    canPerform(user, business.id, capability);

  const operations = [
    item(language, "overview", root),
    ...(can("LOYALTY_EARN")
      ? [item(language, "scan", `${root}/scan`)]
      : []),
    ...(can("CUSTOMERS_VIEW")
      ? [
          item(language, "customers", `${root}/customers`),
          ...(can("CUSTOMERS_EDIT")
            ? [item(language, "duplicates", `${root}/duplicates`)]
            : []),
        ]
      : []),
    ...(can("REPORTS_VIEW")
      ? [item(language, "activity", `${root}/activity`)]
      : []),
  ];

  const growth = can("SETTINGS_EDIT")
    ? [
        item(language, "rewards", `${root}/rewards`),
        item(language, "offers", `${root}/offers`),
        item(language, "campaigns", `${root}/campaigns`),
        item(language, "recovery", `${root}/recovery`),
      ]
    : can("CUSTOMERS_VIEW")
      ? [item(language, "offers", `${root}/offers`)]
      : [];

  const analytics = can("REPORTS_VIEW")
    ? [
        item(language, "reports", `${root}/reports`),
        item(language, "staffReports", `${root}/reports/staff`),
      ]
    : [];

  const administration = [
    ...(can("STAFF_MANAGE")
      ? [item(language, "team", `${root}/users`)]
      : []),
    ...(can("SETTINGS_EDIT")
      ? [
          item(language, "branches", `${root}/branches`),
          item(language, "settings", `${root}/settings`),
          item(language, "playbooks", `${root}/playbooks`),
        ]
      : []),
  ];

  return [
    { id: "global", items: globalItems },
    { id: "operations", label: labels[language].operations, items: operations },
    ...(growth.length
      ? [{ id: "growth", label: labels[language].growth, items: growth }]
      : []),
    ...(analytics.length
      ? [{ id: "analytics", label: labels[language].analytics, items: analytics }]
      : []),
    ...(administration.length
      ? [
          {
            id: "administration",
            label: labels[language].administration,
            items: administration,
          },
        ]
      : []),
  ];
}

export function businessSlugFromPathname(pathname: string | null) {
  const match = pathname?.match(/^\/businesses\/([^/]+)(?:\/|$)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

export function isNavigationItemActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getShellPageContext(
  pathname: string | null,
  language: "AR" | "EN",
  business?: ShellBusiness,
) {
  const text = labels[language];
  if (pathname === "/businesses") return { title: text.businesses, parent: undefined };
  if (pathname === "/dashboard") return { title: text.overview, parent: undefined };
  if (!business) return { title: "LoyalFlow", parent: undefined };

  const suffix = pathname?.replace(`/businesses/${business.slug}`, "") || "";
  const title = suffix.startsWith("/customers/")
    ? language === "AR" ? "تفاصيل العميل" : "Customer details"
    : suffix === "/customers" ? text.customers
    : suffix === "/duplicates" ? text.duplicates
    : suffix === "/scan" || suffix.startsWith("/scan/") ? text.scan
    : suffix === "/activity" ? text.activity
    : suffix === "/rewards" ? text.rewards
    : suffix === "/offers" ? text.offers
    : suffix === "/campaigns" ? text.campaigns
    : suffix === "/recovery" ? text.recovery
    : suffix === "/reports/staff" ? text.staffReports
    : suffix === "/reports" ? text.reports
    : suffix === "/users" ? text.team
    : suffix === "/branches" ? text.branches
    : suffix === "/settings" ? text.settings
    : suffix === "/playbooks" ? text.playbooks
    : text.overview;

  return { title, parent: business.name };
}
