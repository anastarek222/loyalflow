import { createHash } from "node:crypto";

import { isValidOwnerPhone } from "@/lib/business-profile";
import { COUNTRY_OPTIONS } from "@/lib/onboarding/countries";
import { normalizeOwnerOnboardingPhone } from "@/lib/onboarding/owner-onboarding-validation";
import { z } from "zod";

export const PUBLIC_TRIAL_IP_LIMIT = 5;
export const PUBLIC_TRIAL_IDENTITY_LIMIT = 3;
export const PUBLIC_TRIAL_RATE_WINDOW_MS = 60 * 60 * 1000;

const countryNames = new Set(COUNTRY_OPTIONS.map(({ name }) => name));

const publicTrialInputSchema = z.object({
  firstName: z.string().trim().min(2).max(80),
  lastName: z.string().trim().max(80).default(""),
  email: z.string().trim().max(255).email(),
  phone: z.string().trim().min(8).max(25),
  businessName: z.string().trim().min(2).max(120),
  country: z.string().trim().refine((value) => countryNames.has(value)),
  acceptTerms: z.literal("on"),
});

export type PublicTrialInput = {
  firstName: string;
  lastName: string | null;
  email: string;
  phone: string;
  businessName: string;
  country: string;
};

export function parsePublicTrialInput(input: unknown): PublicTrialInput | null {
  const parsed = publicTrialInputSchema.safeParse(input);
  if (!parsed.success) return null;

  const phone = normalizeOwnerOnboardingPhone(
    parsed.data.phone,
    parsed.data.country,
  );
  if (!isValidOwnerPhone(phone)) return null;

  return {
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName || null,
    email: parsed.data.email.toLowerCase(),
    phone,
    businessName: parsed.data.businessName,
    country: parsed.data.country,
  };
}

/**
 * Public limiter keys never contain raw email addresses or phone numbers.
 * The database retains normalized identities as the one-trial authority.
 */
export function createPublicTrialIdentityKey(
  input: Pick<PublicTrialInput, "email" | "phone">,
) {
  return createHash("sha256")
    .update(`public-trial:v1:${input.email}\0${input.phone}`)
    .digest("hex");
}
