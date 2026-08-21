export const BETA_GOOGLE_SHEETS_FULL_REWRITE_CUSTOMER_LIMIT = 2500;

export const GOOGLE_SHEETS_MANAGED_RANGE = "A:L";

export const GOOGLE_SHEETS_CUSTOMER_EXPORT_HEADERS = [
  "Customer ID",
  "Customer Name",
  "Phone Number",
  "Card Link",
  "Current Balance",
  "Unit",
  "Gifts Redeemed",
  "Lifetime Earned",
  "Lifetime Redeemed",
  "Status",
  "Registration Date",
  "Last Updated",
] as const;

export const GOOGLE_SHEETS_GOVERNANCE = {
  spreadsheetProvisioning: "PLATFORM_OPERATOR",
  spreadsheetAclManagement: "EXTERNAL_TO_LOYALFLOW",
  customerDeletion: "REMOVED_ON_NEXT_SUCCESSFUL_SYNC",
  businessDeletion: "TAB_RETAINED_REQUIRES_EXTERNAL_CLEANUP",
  unavailableConfiguration: "NO_PROVIDER_WRITE",
  manualSyncPermission: "SUPER_ADMIN_OR_ASSIGNED_OWNER_WITH_OPERATE",
} as const;
