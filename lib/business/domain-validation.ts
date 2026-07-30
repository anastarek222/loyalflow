import { z } from "zod";

import {
  isSupportedCurrency,
  isValidBusinessPhone,
  isValidIanaTimezone,
} from "@/lib/business-profile";
import { COUNTRY_OPTIONS } from "@/lib/onboarding/countries";
import { normalizeWebsiteUrl } from "@/lib/urls/business-url";

const optionalWebsiteSchema = z.preprocess(
  (value) =>
    typeof value === "string"
      ? normalizeWebsiteUrl(value) ?? value.trim()
      : value,
  z
    .string()
    .trim()
    .max(300)
    .refine(
      (value) => value === "" || normalizeWebsiteUrl(value) !== null,
      "Enter a valid website, for example xtvco.com",
    ),
);

export const businessIdentityFields = {
  name: z.string().trim().min(2).max(80),
  industry: z.string().trim().max(100),
  description: z.string().trim().max(500),
  email: z.string().trim().max(255).email().or(z.literal("")),
  contactPhone: z
    .string()
    .trim()
    .max(25)
    .refine((value) => value === "" || isValidBusinessPhone(value)),
  website: optionalWebsiteSchema,
  country: z.string().trim().max(100),
  city: z.string().trim().max(100),
  address: z.string().trim().max(250),
  currency: z
    .string()
    .trim()
    .refine((value) => value === "" || isSupportedCurrency(value)),
  timezone: z
    .string()
    .trim()
    .refine((value) => value === "" || isValidIanaTimezone(value)),
  taxNumber: z.string().trim().max(100),
  employeeCount: z.coerce.number().int().min(0).max(100000),
} as const;

export const loyaltyProgramFields = {
  loyaltyMode: z.enum(["VISITS", "POINTS", "SALES_AMOUNT"]),
  unitName: z.string().trim().min(1).max(30),
  earnAmount: z.coerce.number().int().min(1).max(1_000_000),
  rewardThreshold: z.coerce.number().int().min(1).max(1_000_000),
  rewardName: z.string().trim().min(2).max(100),
} as const;

export const businessIdentitySchema = z.object(businessIdentityFields);
export const loyaltyProgramSchema = z.object(loyaltyProgramFields);

export function validateCountryProfile(input: {
  country: string;
  currency: string;
  timezone: string;
}) {
  const country = COUNTRY_OPTIONS.find(
    (option) => option.name === input.country,
  );
  if (!country) return { field: "country" as const, reason: "INVALID_COUNTRY" };
  if (!isSupportedCurrency(input.currency))
    return { field: "currency" as const, reason: "INVALID_CURRENCY" };
  if (!isValidIanaTimezone(input.timezone))
    return { field: "timezone" as const, reason: "INVALID_TIMEZONE" };
  const countryTimezones = country.timezones ?? [];
  if (
    countryTimezones.length > 0 &&
    !countryTimezones.includes(input.timezone)
  )
    return { field: "timezone" as const, reason: "COUNTRY_TIMEZONE_MISMATCH" };
  return null;
}
