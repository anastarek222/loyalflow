export const SUPPORTED_CURRENCIES = [
  "AED",
  "EGP",
  "EUR",
  "GBP",
  "KWD",
  "QAR",
  "SAR",
  "USD",
] as const;

export type SupportedCurrency =
  (typeof SUPPORTED_CURRENCIES)[number];

const MAX_SLUG_ATTEMPTS = 8;

export function isSupportedCurrency(value: string) {
  return SUPPORTED_CURRENCIES.includes(
    value as SupportedCurrency
  );
}

export function isValidIanaTimezone(value: string) {
  try {
    Intl.DateTimeFormat("en-US", {
      timeZone: value,
    });

    return true;
  } catch {
    return false;
  }
}

export function optionalProfileValue(value: string) {
  const normalized = value.trim();

  return normalized || null;
}

export function isValidBusinessPhone(value: string) {
  const normalized = value.trim();

  return normalized.length >= 8 && normalized.length <= 25;
}

/** Normalizes an optional owner phone number without changing its country code. */
export function normalizeOwnerPhone(value: string) {
  return value.trim().replace(/[\s().-]/g, "");
}

export function isValidOwnerPhone(value: string) {
  return /^\+?\d{8,15}$/.test(normalizeOwnerPhone(value));
}

export function optionalOwnerPhoneValue(value: string) {
  const normalized = normalizeOwnerPhone(value);

  return normalized || null;
}

export function slugifyBusinessName(name: string) {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42)
    .replace(/-+$/g, "");

  return slug || "business";
}

export function getSlugCandidate(
  baseSlug: string,
  attempt: number
) {
  if (attempt === 0) {
    return baseSlug;
  }

  const suffix = `-${attempt + 1}`;

  return `${baseSlug.slice(0, 50 - suffix.length)}${suffix}`;
}

export function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

/**
 * Creates a record with a slug derived from its name. The database unique
 * constraint remains the authority: a collision retries with a bounded suffix.
 */
export async function createWithGeneratedSlug<T>(
  name: string,
  create: (slug: string) => Promise<T>
) {
  const baseSlug = slugifyBusinessName(name);

  for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt += 1) {
    try {
      return await create(getSlugCandidate(baseSlug, attempt));
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }
    }
  }

  throw new Error("SAFE_SLUG_GENERATION_FAILED");
}
