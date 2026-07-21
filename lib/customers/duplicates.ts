import { normalizePhone } from "@/lib/customers/registration";

export type DuplicateCustomerCandidate = {
  id: string;
  businessId: string;
  firstName: string;
  lastName?: string | null;
  phone: string;
  customerCode: string;
  email?: string | null;
  createdAt: Date;
};

export type DuplicateReason =
  | "NORMALIZED_PHONE"
  | "NORMALIZED_EMAIL"
  | "CUSTOMER_CODE";

export type DuplicateGroup<T extends DuplicateCustomerCandidate> = {
  key: string;
  reason: DuplicateReason;
  customers: T[];
};

function normalizeEmail(value: string) {
  return value.trim().toLocaleLowerCase();
}

function createGroups<T extends DuplicateCustomerCandidate>(
  customers: readonly T[],
  reason: DuplicateReason,
  getValue: (customer: T) => string | null
) {
  const groups = new Map<string, T[]>();

  for (const customer of customers) {
    const value = getValue(customer);
    if (!value) continue;

    const key = `${customer.businessId}:${value}`;
    groups.set(key, [...(groups.get(key) ?? []), customer]);
  }

  return Array.from(groups.entries())
    .filter(([, group]) => group.length > 1)
    .map(([key, group]) => ({
      key,
      reason,
      customers: [...group].sort(
        (left, right) => left.createdAt.getTime() - right.createdAt.getTime()
      ),
    }));
}

/**
 * This is deliberately review-only. Current tenant uniqueness constraints
 * prevent ordinary exact-phone/code duplicates, while this catches legacy or
 * imported records whose formatting normalizes to the same phone. Email is
 * supported for a future persisted email field but produces no groups today.
 */
export function findDuplicateCustomerGroups<T extends DuplicateCustomerCandidate>(
  customers: readonly T[]
): DuplicateGroup<T>[] {
  const phoneGroups = createGroups(customers, "NORMALIZED_PHONE", (customer) => {
    const phone = normalizePhone(customer.phone).replace(/^\+/, "");
    return /^\d{8,15}$/.test(phone) ? phone : null;
  });
  const emailGroups = createGroups(customers, "NORMALIZED_EMAIL", (customer) =>
    customer.email ? normalizeEmail(customer.email) : null
  );
  const codeGroups = createGroups(customers, "CUSTOMER_CODE", (customer) => {
    const code = customer.customerCode.trim().toLocaleUpperCase();
    return code || null;
  });

  return [...phoneGroups, ...emailGroups, ...codeGroups].sort((left, right) =>
    left.key.localeCompare(right.key)
  );
}

export function getDuplicateReasonLabel(reason: DuplicateReason) {
  switch (reason) {
    case "NORMALIZED_PHONE":
      return "رقم هاتف متطابق بعد التوحيد";
    case "NORMALIZED_EMAIL":
      return "بريد إلكتروني متطابق بعد التوحيد";
    case "CUSTOMER_CODE":
      return "تعارض كود العميل";
  }
}

/**
 * A non-executable preview makes the survivor decision visible without moving
 * balances, transactions, rewards, referrals, tags, notes, or public tokens.
 */
export function getReadOnlyMergePreview<T extends DuplicateCustomerCandidate>(
  group: DuplicateGroup<T>
) {
  const [survivor, ...sourceCustomers] = group.customers;

  return {
    survivor,
    sourceCustomers,
    executable: false as const,
    preservationRequirements: [
      "Keep every loyalty transaction and its original balance-after value.",
      "Do not add or subtract balances without an approved ledger policy.",
      "Preserve reward, redemption, referral, tag, note, activity, and public-card evidence.",
    ],
  };
}
