import type { LoyaltyMode } from "@/generated/prisma/client";
import {
  getCustomerFilterSegments,
  type CustomerSegment,
} from "@/lib/customers/segments";

export const DASHBOARD_RECENT_ACTIVITY_LIMIT = 5;

export type DashboardRole =
  | "SUPER_ADMIN"
  | "OWNER"
  | "MANAGER"
  | "STAFF"
  | "VIEWER";

type BusinessDashboardCapabilities = {
  canScan: boolean;
  canViewReports: boolean;
  canManageSettings: boolean;
  canManageUsers: boolean;
};

export type BusinessDashboardAction = {
  id: "scan" | "reports" | "customers" | "recovery" | "offers" | "campaigns" | "rewards" | "team" | "branches" | "settings";
  href: string;
  mutation: boolean;
};

export function getGlobalDashboardMode(businessCount: number) {
  if (businessCount <= 0) return "empty" as const;
  if (businessCount === 1) return "single" as const;
  return "multiple" as const;
}

/** Core setup is the only setup state that deserves dashboard space. */
export function shouldShowOnboardingChecklist(coreReady: boolean) {
  return !coreReady;
}

export function getDashboardSegmentShortcuts(loyaltyMode: LoyaltyMode) {
  const preferred: CustomerSegment[] = [
    "NEW",
    "ACTIVE",
    "AT_RISK",
    "VIP",
    "REWARD_READY",
  ];
  const supported = new Set(getCustomerFilterSegments(loyaltyMode));
  return preferred.filter((segment) => supported.has(segment));
}

export function getBusinessDashboardActions(
  slug: string,
  capabilities: BusinessDashboardCapabilities,
) {
  const base = `/businesses/${slug}`;
  const actions: BusinessDashboardAction[] = [
    { id: "customers", href: `${base}/customers`, mutation: false },
  ];

  if (capabilities.canScan) {
    actions.unshift({ id: "scan", href: `${base}/scan`, mutation: true });
  }
  if (capabilities.canViewReports) {
    actions.push({ id: "reports", href: `${base}/reports`, mutation: false });
  }
  if (capabilities.canManageSettings) {
    actions.push(
      { id: "recovery", href: `${base}/recovery`, mutation: false },
      { id: "offers", href: `${base}/offers`, mutation: true },
      { id: "campaigns", href: `${base}/campaigns`, mutation: true },
      { id: "rewards", href: `${base}/rewards`, mutation: true },
      { id: "branches", href: `${base}/branches`, mutation: true },
      { id: "settings", href: `${base}/settings`, mutation: true },
    );
  }
  if (capabilities.canManageUsers) {
    actions.push({ id: "team", href: `${base}/users`, mutation: true });
  }

  return actions;
}
