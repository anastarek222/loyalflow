import { passwordValueSchema } from "@/lib/auth/password-policy";
import { isValidRemoteImageUrl } from "@/lib/branding/image-data";
import {
  isSupportedCurrency,
  isValidBusinessPhone,
  isValidIanaTimezone,
  isValidOwnerPhone,
} from "@/lib/business-profile";
import { z } from "zod";

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export const businessCreationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  contactPhone: z
    .string()
    .trim()
    .max(25)
    .refine((value) => value === "" || isValidBusinessPhone(value)),
  currency: z
    .string()
    .trim()
    .refine((value) => value === "" || isSupportedCurrency(value)),
  timezone: z
    .string()
    .trim()
    .refine((value) => value === "" || isValidIanaTimezone(value)),
  industry: z.string().trim().max(100),
  website: z
    .string()
    .trim()
    .max(300)
    .refine((value) => value === "" || isValidHttpUrl(value)),
  email: z.string().trim().max(255).email().or(z.literal("")),
  country: z.string().trim().max(100),
  city: z.string().trim().max(100),
  taxNumber: z.string().trim().max(100),
  employeeCount: z.coerce.number().int().min(0).max(100000),
  ownerFirstName: z.string().trim().min(2).max(80),
  ownerLastName: z.string().trim().max(80),
  ownerEmail: z.string().trim().max(255).email(),
  ownerPhone: z
    .string()
    .trim()
    .max(25)
    .refine((value) => value === "" || isValidOwnerPhone(value)),
  ownerPassword: passwordValueSchema,
  logoUrl: z
    .string()
    .trim()
    .max(500)
    .refine((value) => value === "" || isValidRemoteImageUrl(value)),
  loyaltyMode: z.enum(["VISITS", "POINTS", "SALES_AMOUNT"]),
  unitName: z.string().trim().min(1).max(30),
  rewardName: z.string().trim().min(2).max(100),
  rewardThreshold: z.coerce.number().int().min(1).max(1000000),
  earnAmount: z.coerce.number().int().min(1).max(1000000),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  themePreset: z.enum([
    "DEFAULT",
    "MINIMAL",
    "LUXURY",
    "DARK",
    "MODERN",
    "GRADIENT",
  ]),
  cardStyle: z.enum(["CLASSIC", "COMPACT", "PREMIUM"]),
  fontFamily: z.enum(["INTER", "CAIRO", "POPPINS"]),
});
