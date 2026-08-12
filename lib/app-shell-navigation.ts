import type { UserRole } from "@/generated/prisma/client";

import { canPerform, type TenantUser } from "@/lib/permissions";
import { hasFeatureEntitlement, type LoyalFlowPlan } from "@/lib/entitlements";
import {
  getExperienceNavigationRules,
  type ExperienceAccess,
  type ExperienceMode,
} from "@/lib/experience-mode";

export type ShellBusiness = {
  id: string;
  name: string;
  slug: string;
  plan?: LoyalFlowPlan;
};

export type ShellUser = TenantUser & {
  role: UserRole;
  experienceAccess?: ExperienceAccess;
};

export type ShellNavigationItem = {
  id: NavigationId;
  label: string;
  href: string;
  action?: "switch-mode";
  icon:
    | "overview"
    | "businesses"
    | "owners"
    | "plans"
    | "platformOps"
    | "scan"
    | "customers"
    | "activity"
    | "program"
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
  | "owners"
  | "plans"
  | "platformOps"
  | "scan"
  | "customers"
  | "activity"
  | "program"
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
  | "playbooks"
  | "advancedTools";

export type ShellNavigationGroup = {
  id: string;
  label?: string;
  items: ShellNavigationItem[];
};

const labels = {
  AR: {
    overview: "الرئيسية",
    businesses: "الأنشطة التجارية",
    owners: "ملاك الأنشطة",
    platformOps: "مركز التشغيل",
    plans: "الخطط والحدود",
    operations: "العمليات",
    growth: "النمو",
    loyalty: "الولاء",
    analytics: "التحليلات",
    administration: "الإدارة",
    scan: "المسح",
    customers: "العملاء",
    activity: "النشاط",
    program: "برنامج الولاء",
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
    home: "الرئيسية",
    more: "المزيد",
    advancedTools: "أدوات متقدمة",
  },
  EN: {
    overview: "Overview",
    businesses: "Businesses",
    owners: "Business owners",
    platformOps: "Operations centre",
    plans: "Plans & limits",
    operations: "Operations",
    growth: "Growth",
    loyalty: "Loyalty",
    analytics: "Analytics",
    administration: "Administration",
    scan: "Scan",
    customers: "Customers",
    activity: "Activity",
    program: "Loyalty Program",
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
    home: "Home",
    more: "More",
    advancedTools: "Advanced tools",
  },
} as const;

type BuildNavigationInput = {
  language: "AR" | "EN";
  user: ShellUser;
  business?: ShellBusiness;
  experienceMode?: ExperienceMode;
};

function item(
  language: "AR" | "EN",
  id: Exclude<NavigationId, "advancedTools">,
  href: string,
): ShellNavigationItem {
  return { id, href, icon: id, label: labels[language][id] };
}

export function buildShellNavigation({
  language,
  user,
  business,
  experienceMode = "ADVANCED",
}: BuildNavigationInput): ShellNavigationGroup[] {
  const globalItems = [item(language, "overview", "/dashboard")];

  if (user.role === "SUPER_ADMIN") {
    globalItems.push(item(language, "businesses", "/businesses"));
    globalItems.push(item(language, "owners", "/business-owners"));
    globalItems.push(item(language, "plans", "/plans"));
    globalItems.push(item(language, "platformOps", "/operations"));
  }

  if (!business) {
    return [
      {
        id: "global",
        label:
          user.role === "SUPER_ADMIN"
            ? language === "AR"
              ? "إدارة المنصة"
              : "Platform administration"
            : undefined,
        items: globalItems,
      },
    ];
  }

  const root = `/businesses/${business.slug}`;
  const can = (capability: Parameters<typeof canPerform>[2]) =>
    canPerform(user, business.id, capability);
  const entitled = (feature: Parameters<typeof hasFeatureEntitlement>[1]) =>
    hasFeatureEntitlement(business.plan ?? "BUSINESS", feature);

  const operations = [
    item(language, "overview", root),
    ...(can("LOYALTY_EARN") ? [item(language, "scan", `${root}/scan`)] : []),
    ...(can("CUSTOMERS_VIEW")
      ? [item(language, "customers", `${root}/customers`)]
      : []),
    ...(can("REPORTS_VIEW")
      ? [item(language, "activity", `${root}/activity`)]
      : []),
  ];

  const growth = can("SETTINGS_EDIT")
    ? [
        ...(entitled("REWARDS")
          ? [item(language, "rewards", `${root}/rewards`)]
          : []),
        ...(entitled("OFFERS")
          ? [item(language, "offers", `${root}/offers`)]
          : []),
        ...(entitled("CAMPAIGNS")
          ? [item(language, "campaigns", `${root}/campaigns`)]
          : []),
        ...(entitled("CAMPAIGNS")
          ? [item(language, "recovery", `${root}/recovery`)]
          : []),
      ]
    : can("CUSTOMERS_VIEW") && entitled("OFFERS")
      ? [item(language, "offers", `${root}/offers`)]
      : [];

  const loyalty = can("SETTINGS_EDIT")
    ? [item(language, "program", `${root}/program`)]
    : [];

  const analytics =
    can("REPORTS_VIEW") && entitled("REPORTING")
      ? [item(language, "reports", `${root}/reports`)]
      : [];

  const administration = [
    ...(can("STAFF_MANAGE") ? [item(language, "team", `${root}/users`)] : []),
    ...(can("SETTINGS_EDIT")
      ? [
          item(language, "branches", `${root}/branches`),
          item(language, "settings", `${root}/settings`),
        ]
      : []),
  ];

  const advancedNavigation = [
    { id: "global", items: globalItems },
    { id: "operations", label: labels[language].operations, items: operations },
    ...(loyalty.length
      ? [{ id: "loyalty", label: labels[language].loyalty, items: loyalty }]
      : []),
    ...(growth.length
      ? [{ id: "growth", label: labels[language].growth, items: growth }]
      : []),
    ...(analytics.length
      ? [
          {
            id: "analytics",
            label: labels[language].analytics,
            items: analytics,
          },
        ]
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

  if (experienceMode === "ADVANCED") return advancedNavigation;

  const primaryIds = new Set<NavigationId>([
    "overview",
    "scan",
    "customers",
    "activity",
  ]);
  const advancedDestinations = advancedNavigation
    .filter((group) => group.id !== "global")
    .flatMap((group) => group.items)
    .filter((entry) => !primaryIds.has(entry.id));
  const rules = getExperienceNavigationRules({
    mode: experienceMode,
    role: user.role,
    access: user.experienceAccess,
    advancedDestinationCount: advancedDestinations.length,
  });
  const simplePrimary = advancedNavigation
    .filter((group) => group.id !== "global")
    .flatMap((group) => group.items)
    .filter((entry) => primaryIds.has(entry.id))
    .map((entry) =>
      entry.id === "overview"
        ? { ...entry, label: labels[language].home }
        : entry,
    );

  return [
    { id: "simple-primary", items: simplePrimary },
    ...(advancedDestinations.length || rules.showAdvancedToolsEntry
      ? [
          {
            id: "more",
            label: labels[language].more,
            items: [
              ...advancedDestinations.filter(
                (entry) => entry.id === "reports" || entry.id === "program",
              ),
              ...(rules.showAdvancedToolsEntry
                ? [
                    {
                      id: "advancedTools" as const,
                      label: labels[language].advancedTools,
                      icon: "settings" as const,
                      href: "#experience-mode",
                      action: "switch-mode" as const,
                    },
                  ]
                : []),
            ],
          },
        ]
      : []),
  ].filter((group) => group.items.length);
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
  const platformParent =
    language === "AR" ? "إدارة المنصة" : "Platform administration";
  if (pathname === "/businesses")
    return { title: text.businesses, parent: platformParent };
  if (pathname === "/business-owners")
    return { title: text.owners, parent: platformParent };
  if (pathname === "/operations")
    return { title: text.platformOps, parent: platformParent };
  if (pathname === "/plans")
    return { title: text.plans, parent: platformParent };
  if (pathname === "/dashboard")
    return { title: text.overview, parent: undefined };
  if (!business) return { title: "LoyalFlow", parent: undefined };

  const suffix = pathname?.replace(`/businesses/${business.slug}`, "") || "";
  const title = suffix.startsWith("/customers/")
    ? language === "AR"
      ? "تفاصيل العميل"
      : "Customer details"
    : suffix === "/customers"
      ? text.customers
      : suffix === "/duplicates"
        ? text.duplicates
        : suffix === "/scan" || suffix.startsWith("/scan/")
          ? text.scan
          : suffix === "/activity"
            ? text.activity
            : suffix === "/program"
              ? text.program
              : suffix === "/rewards"
                ? text.rewards
                : suffix === "/offers"
                  ? text.offers
                  : suffix === "/campaigns"
                    ? text.campaigns
                    : suffix === "/recovery"
                      ? text.recovery
                      : suffix === "/reports/staff"
                        ? text.staffReports
                        : suffix === "/reports"
                          ? text.reports
                          : suffix === "/users"
                            ? text.team
                            : suffix === "/branches"
                              ? text.branches
                              : suffix === "/settings"
                                ? text.settings
                                : suffix === "/playbooks"
                                  ? text.playbooks
                                  : text.overview;

  return { title, parent: business.name };
}
