export type RoleAwareEntryRole =
  | "SUPER_ADMIN"
  | "OWNER"
  | "MANAGER"
  | "STAFF"
  | "VIEWER";

type RoleAwareEntryBusiness = {
  slug: string;
  isActive: boolean;
};

type ResolveRoleAwareEntryInput = {
  role: RoleAwareEntryRole;
  business: RoleAwareEntryBusiness | null | undefined;
  canScan: boolean;
};

export function resolveRoleAwareEntry({
  role,
  business,
  canScan,
}: ResolveRoleAwareEntryInput) {
  if (role === "SUPER_ADMIN" || !business?.isActive) return null;

  const businessRoot = `/businesses/${business.slug}`;
  if (role === "STAFF" && canScan) return `${businessRoot}/scan`;

  return businessRoot;
}
