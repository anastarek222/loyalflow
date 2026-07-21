import { randomBytes } from "node:crypto";

const REFERRAL_CODE_PATTERN = /^[A-Z0-9]{8}$/;

export function normalizeReferralCode(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return REFERRAL_CODE_PATTERN.test(normalized) ? normalized : null;
}

export function createReferralCodeCandidate() {
  return randomBytes(4).toString("hex").toUpperCase();
}

export function canRecordReferral(input: {
  businessId: string;
  referrerBusinessId: string;
  referrerCustomerId: string;
  referredCustomerId: string;
  referrerIsActive: boolean;
}) {
  return (
    input.referrerBusinessId === input.businessId &&
    input.referrerCustomerId !== input.referredCustomerId &&
    input.referrerIsActive
  );
}
