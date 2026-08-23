import { passwordValueSchema } from "@/lib/auth/password-policy";
import { billingInputSchema } from "@/lib/billing/subscription";
import { isValidRemoteImageUrl } from "@/lib/branding/image-data";
import {
  isValidOwnerPhone,
} from "@/lib/business-profile";
import { z } from "zod";
import { STANDARD_CARD_ARTWORK_CATEGORIES } from "@/lib/cards/standard-card";
import {
  businessIdentityFields,
  loyaltyProgramFields,
  validateCountryProfile,
} from "@/lib/business/domain-validation";

const formBoolean = z.preprocess(
  (value) => value === true || value === "true" || value === "on",
  z.boolean(),
);

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export const businessCreationSchema = z.object({
  name: businessIdentityFields.name,
  contactPhone: businessIdentityFields.contactPhone,
  currency: businessIdentityFields.currency,
  timezone: businessIdentityFields.timezone,
  industry: businessIdentityFields.industry,
  website: businessIdentityFields.website,
  email: businessIdentityFields.email,
  country: businessIdentityFields.country,
  city: businessIdentityFields.city,
  taxNumber: businessIdentityFields.taxNumber,
  employeeCount: businessIdentityFields.employeeCount,
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
  ...loyaltyProgramFields,
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
  standardCardArtworkEnabled: formBoolean.default(true),
  standardCardArtworkCategory: z.enum(STANDARD_CARD_ARTWORK_CATEGORIES).default("OTHER"),
  cardDesignMode: z.enum(["STANDARD", "CUSTOM"]).default("STANDARD"),
  customCardArtworkEnabled: formBoolean.default(false),
  customCardFrontArtworkUrl: z.string().trim().max(500).refine((value) => value === "" || isValidHttpUrl(value)).default(""),
  customCardBackArtworkUrl: z.string().trim().max(500).refine((value) => value === "" || isValidHttpUrl(value)).default(""),
  customCardSafeZoneVersion: z.literal("ID1_V1").default("ID1_V1"),
  plan: z.enum(["FREE", "STARTER", "PRO", "BUSINESS"]).default("FREE"),
}).and(billingInputSchema).superRefine((value, context) => {
  if (value.country && value.currency && value.timezone) {
    const profileError = validateCountryProfile(value);
    if (profileError) {
      context.addIssue({
        code: "custom",
        path: [profileError.field],
        message:
          profileError.reason === "COUNTRY_TIMEZONE_MISMATCH"
            ? "Choose a timezone for the selected country."
            : `Choose a valid ${profileError.field}.`,
      });
    }
  }
  if (
    value.cardDesignMode === "CUSTOM" &&
    (
      !value.customCardArtworkEnabled ||
      !value.customCardFrontArtworkUrl ||
      !value.customCardBackArtworkUrl
    )
  ) {
    context.addIssue({
      code: "custom",
      path: ["cardDesignMode"],
      message: "Custom Card requires approved Front + Back artwork.",
    });
  }
});

export const ownerInvitationSchema = z.object({
  ownerFirstName: z.string().trim().min(2).max(80),
  ownerLastName: z.string().trim().max(80),
  ownerEmail: z.string().trim().max(255).email(),
});
