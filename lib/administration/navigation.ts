import { navigationMessages } from "@loyalflow/i18n/navigation";

import type { TenantUser } from "@/lib/permissions";
import { canManageBusiness, canPerform } from "@/lib/permissions";

export type AdministrationSection =
  "settings" | "program" | "users" | "branches" | "playbooks";

export type AdministrationNavigationItem = {
  id: AdministrationSection;
  href: string;
  label: string;
  description: string;
};

/** Presentation only. Every linked route and mutation re-checks authority. */
export function getAdministrationNavigation(
  user: TenantUser,
  businessId: string,
  slug: string,
  language: "AR" | "EN" = "AR",
): AdministrationNavigationItem[] {
  const copy =
    language === "AR" ? navigationMessages.ar : navigationMessages.en;
  const items: AdministrationNavigationItem[] = [];
  if (canManageBusiness(user, businessId)) {
    items.push({
      id: "settings",
      href: `/businesses/${slug}/settings`,
      label: copy.administrationSettingsLabel,
      description: copy.administrationSettingsDescription,
    });
    items.push({
      id: "program",
      href: `/businesses/${slug}/program`,
      label: copy.administrationProgramLabel,
      description: copy.administrationProgramDescription,
    });
    items.push({
      id: "branches",
      href: `/businesses/${slug}/branches`,
      label: copy.administrationBranchesLabel,
      description: copy.administrationBranchesDescription,
    });
    items.push({
      id: "playbooks",
      href: `/businesses/${slug}/playbooks`,
      label: copy.administrationPlaybooksLabel,
      description: copy.administrationPlaybooksDescription,
    });
  }
  if (canPerform(user, businessId, "STAFF_MANAGE")) {
    items.splice(1, 0, {
      id: "users",
      href: `/businesses/${slug}/users`,
      label: copy.administrationUsersLabel,
      description: copy.administrationUsersDescription,
    });
  }
  return items;
}
