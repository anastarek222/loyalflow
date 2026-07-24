import { z } from "zod";
import { normalizePhone } from "@/lib/customers/phone";
import { opaqueIdSchema } from "@/lib/validation/action-input";

export const SCAN_CUSTOMER_SEARCH_LIMIT = 8;
export const SCAN_CUSTOMER_SEARCH_MIN_LENGTH = 2;
export const SCAN_CUSTOMER_SEARCH_MAX_LENGTH = 100;

export const SCAN_CUSTOMER_SEARCH_ERROR_CODES = [
  "UNAUTHENTICATED",
  "INVALID_INPUT",
  "FORBIDDEN",
  "RATE_LIMITED",
  "BUSINESS_UNAVAILABLE",
  "UNKNOWN",
] as const;

export type ScanCustomerSearchErrorCode =
  (typeof SCAN_CUSTOMER_SEARCH_ERROR_CODES)[number];

export const scanCustomerSearchSchema = z.object({
  businessId: opaqueIdSchema,
  query: z.string().trim().min(SCAN_CUSTOMER_SEARCH_MIN_LENGTH).max(SCAN_CUSTOMER_SEARCH_MAX_LENGTH),
});

export function scanCustomerSearchError(code: ScanCustomerSearchErrorCode) {
  return { ok: false as const, code };
}

export function getScanCustomerSearchErrorCode(value: unknown): ScanCustomerSearchErrorCode {
  if (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    typeof value.code === "string" &&
    SCAN_CUSTOMER_SEARCH_ERROR_CODES.includes(value.code as ScanCustomerSearchErrorCode)
  ) {
    return value.code as ScanCustomerSearchErrorCode;
  }

  return "UNKNOWN";
}

export function getScanCustomerSearchTerms(query: string) {
  return {
    text: query.trim(),
    phone: normalizePhone(query.trim()),
    customerCode: query.trim().toLocaleUpperCase(),
  };
}

export function maskCustomerPhone(phone: string) {
  const visible = 4;
  if (phone.length <= visible) return phone;
  return `${"•".repeat(Math.max(0, phone.length - visible))}${phone.slice(-visible)}`;
}
