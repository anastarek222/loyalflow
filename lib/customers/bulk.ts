export const MAX_BULK_CUSTOMERS = 100;

export type BulkCustomerOperation =
  | "ADD_TAG"
  | "REMOVE_TAG"
  | "ACTIVATE"
  | "DEACTIVATE";

export function parseSelectedCustomerIds(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.length === 0 || parsed.length > MAX_BULK_CUSTOMERS) {
      return null;
    }
    if (!parsed.every((id) => typeof id === "string" && /^[A-Za-z0-9_-]{8,128}$/.test(id))) {
      return null;
    }

    const uniqueIds = [...new Set(parsed)];
    return uniqueIds.length === parsed.length ? uniqueIds : null;
  } catch {
    return null;
  }
}

export function parseSelectedExportIds(value: string | null) {
  if (!value) return null;
  const ids = value.split(",").filter(Boolean);
  if (ids.length === 0 || ids.length > MAX_BULK_CUSTOMERS) return null;
  if (!ids.every((id) => /^[A-Za-z0-9_-]{8,128}$/.test(id))) return null;

  const uniqueIds = [...new Set(ids)];
  return uniqueIds.length === ids.length ? uniqueIds : null;
}

export function getBulkStateChangeIds(
  customers: readonly { id: string; businessId: string; isActive: boolean }[],
  businessId: string,
  selectedIds: readonly string[],
  activate: boolean
) {
  if (
    customers.length !== selectedIds.length ||
    customers.some((customer) => customer.businessId !== businessId)
  ) {
    return null;
  }

  return customers
    .filter((customer) => customer.isActive !== activate)
    .map((customer) => customer.id);
}

export function requiresBulkConfirmation(operation: BulkCustomerOperation) {
  return operation === "DEACTIVATE" || operation === "REMOVE_TAG";
}
