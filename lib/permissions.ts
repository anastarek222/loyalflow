import type { UserRole } from "@/generated/prisma/client";

export const capabilities = [
  "CUSTOMERS_VIEW",
  "CUSTOMERS_EDIT",
  "LOYALTY_EARN",
  "LOYALTY_REDEEM",
  "LOYALTY_ADJUST",
  "REPORTS_VIEW",
  "STAFF_MANAGE",
  "SETTINGS_EDIT",
] as const;

export type Capability = (typeof capabilities)[number];

export type TenantUser = {
  role: UserRole;
  businessId: string | null | undefined;
};

const roleCapabilities: Record<Exclude<UserRole, "SUPER_ADMIN">, readonly Capability[]> = {
  OWNER: capabilities,
  MANAGER: [
    "CUSTOMERS_VIEW",
    "CUSTOMERS_EDIT",
    "LOYALTY_EARN",
    "LOYALTY_REDEEM",
    "LOYALTY_ADJUST",
    "REPORTS_VIEW",
  ],
  STAFF: ["CUSTOMERS_VIEW", "LOYALTY_EARN", "LOYALTY_REDEEM"],
  VIEWER: ["CUSTOMERS_VIEW", "REPORTS_VIEW"],
};

export function isSuperAdmin(
  user: TenantUser
): user is TenantUser & { role: "SUPER_ADMIN" } {
  return user.role === "SUPER_ADMIN";
}

export function isBusinessOwner(
  user: TenantUser,
  businessId: string
) {
  return user.role === "OWNER" && user.businessId === businessId;
}

export function canAccessBusiness(
  user: TenantUser,
  businessId: string
) {
  return canPerform(user, businessId, "CUSTOMERS_VIEW");
}

export function canPerform(
  user: TenantUser,
  businessId: string,
  capability: Capability
) {
  if (isSuperAdmin(user)) return true;
  if (user.businessId !== businessId) return false;
  return roleCapabilities[
    user.role as Exclude<UserRole, "SUPER_ADMIN">
  ].includes(capability);
}

export function canManageBusiness(
  user: TenantUser,
  businessId: string
) {
  return canPerform(user, businessId, "SETTINGS_EDIT");
}

export function canExportBusinessData(
  user: TenantUser,
  businessId: string,
  allowOwnerDataExport: boolean
) {
  return (
    isSuperAdmin(user) ||
    (isBusinessOwner(user, businessId) && allowOwnerDataExport)
  );
}
