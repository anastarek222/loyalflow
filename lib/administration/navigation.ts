import type { TenantUser } from "@/lib/permissions";
import { canManageBusiness, canPerform } from "@/lib/permissions";

export type AdministrationSection = "settings" | "users" | "branches" | "playbooks";

export type AdministrationNavigationItem = {
  id: AdministrationSection;
  href: string;
  label: string;
  description: string;
};

const copy = {
  AR: {
    settings: ["إعدادات النشاط", "الملف والولاء والهوية والتسجيل"],
    users: ["الفريق", "الأدوار وحسابات الفريق ووصول الواجهة"],
    branches: ["الفروع", "الفروع والموظفون المكلّفون"],
    playbooks: ["قوالب التشغيل", "معاينة إعدادات قابلة للتطبيق بأمان"],
  },
  EN: {
    settings: ["Business settings", "Profile, loyalty, brand, and enrollment"],
    users: ["Team", "Roles, team accounts, and interface access"],
    branches: ["Branches", "Locations and assigned staff"],
    playbooks: ["Playbooks", "Safely preview reusable configurations"],
  },
} as const;

/** Presentation only. Every linked route and mutation re-checks authority. */
export function getAdministrationNavigation(
  user: TenantUser,
  businessId: string,
  slug: string,
  language: "AR" | "EN" = "AR",
): AdministrationNavigationItem[] {
  const labels = copy[language];
  const items: AdministrationNavigationItem[] = [];
  if (canManageBusiness(user, businessId)) {
    items.push({ id: "settings", href: `/businesses/${slug}/settings`, label: labels.settings[0], description: labels.settings[1] });
    items.push({ id: "branches", href: `/businesses/${slug}/branches`, label: labels.branches[0], description: labels.branches[1] });
    items.push({ id: "playbooks", href: `/businesses/${slug}/playbooks`, label: labels.playbooks[0], description: labels.playbooks[1] });
  }
  if (canPerform(user, businessId, "STAFF_MANAGE")) {
    items.splice(1, 0, { id: "users", href: `/businesses/${slug}/users`, label: labels.users[0], description: labels.users[1] });
  }
  return items;
}
