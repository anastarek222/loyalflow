import { z } from "zod";

import { isValidRemoteImageUrl } from "@/lib/branding/image-data";
import { optionalProfileValue } from "@/lib/business-profile";
import {
  businessIdentityFields,
  loyaltyProgramFields,
} from "@/lib/business/domain-validation";

export const businessProfileSettingsSchema = z.object({
  name: businessIdentityFields.name,
  coverImageUrl: z
    .string()
    .trim()
    .max(500)
    .refine((value) => value === "" || isValidRemoteImageUrl(value)),
  currency: businessIdentityFields.currency,
  timezone: businessIdentityFields.timezone,
  industry: businessIdentityFields.industry,
  website: businessIdentityFields.website,
  email: businessIdentityFields.email,
  country: businessIdentityFields.country,
  city: businessIdentityFields.city,
  taxNumber: businessIdentityFields.taxNumber,
  employeeCount: businessIdentityFields.employeeCount,
  description: businessIdentityFields.description,
  instagramUrl: z.string().trim().max(300),
});

export const programRulesSettingsSchema = z
  .object({
    loyaltyProgramName: z.string().trim().max(80),
    pointsName: z.string().trim().max(30),
    welcomeMessage: z.string().trim().max(300),
    cardDefaultLanguage: z.enum(["AR", "EN"]),
    loyaltyMode: loyaltyProgramFields.loyaltyMode,
    unitName: loyaltyProgramFields.unitName,
    rewardName: loyaltyProgramFields.rewardName,
    rewardType: z.enum(["GIFT", "PROMO_CODE", "DISCOUNT", "CUSTOM"]),
    rewardCode: z.string().trim().max(80),
    rewardDescription: z.string().trim().max(300),
    rewardThreshold: loyaltyProgramFields.rewardThreshold,
    earnAmount: loyaltyProgramFields.earnAmount,
  })
  .superRefine((value, context) => {
    if (value.rewardType === "PROMO_CODE" && value.rewardCode.length < 2) {
      context.addIssue({
        code: "custom",
        path: ["rewardCode"],
        message: "Promo code rewards require a code.",
      });
    }
  });

export const customerMessagesSettingsSchema = z.object({
  whatsappWelcomeMessage: z.string().trim().min(1).max(1500),
  whatsappBalanceMessage: z.string().trim().min(1).max(1500),
  whatsappRewardMessage: z.string().trim().min(1).max(1500),
});

export const operationsSettingsSchema = z.object({
  staffAttributionMode: z.enum(["OFF", "OPTIONAL", "REQUIRED"]),
});

export function getBusinessProfileUpdate(
  value: z.infer<typeof businessProfileSettingsSchema>,
  coverImageUrl: string | null,
) {
  return {
    name: value.name,
    coverImageUrl,
    currency: optionalProfileValue(value.currency),
    timezone: optionalProfileValue(value.timezone),
    industry: optionalProfileValue(value.industry),
    website: optionalProfileValue(value.website),
    email: optionalProfileValue(value.email),
    country: optionalProfileValue(value.country),
    city: optionalProfileValue(value.city),
    taxNumber: optionalProfileValue(value.taxNumber),
    employeeCount: value.employeeCount,
    description: optionalProfileValue(value.description),
    instagramUrl: optionalProfileValue(value.instagramUrl),
  };
}

export function getProgramRulesUpdate(
  value: z.infer<typeof programRulesSettingsSchema>,
) {
  return {
    loyaltyProgramName: value.loyaltyProgramName || null,
    pointsName: value.pointsName || null,
    welcomeMessage: value.welcomeMessage || null,
    cardDefaultLanguage: value.cardDefaultLanguage,
    loyaltyMode: value.loyaltyMode,
    unitName: value.unitName,
    rewardName: value.rewardName,
    rewardType: value.rewardType,
    rewardCode: value.rewardCode || null,
    rewardDescription: value.rewardDescription || null,
    rewardThreshold: value.rewardThreshold,
    earnAmount: value.earnAmount,
  };
}

export function getCustomerMessagesUpdate(
  value: z.infer<typeof customerMessagesSettingsSchema>,
) {
  return {
    whatsappWelcomeMessage: value.whatsappWelcomeMessage,
    whatsappBalanceMessage: value.whatsappBalanceMessage,
    whatsappRewardMessage: value.whatsappRewardMessage,
  };
}

export function getOperationsSettingsUpdate(
  value: z.infer<typeof operationsSettingsSchema>,
) {
  return {
    staffAttributionEnabled: value.staffAttributionMode !== "OFF",
    staffAttributionRequired: value.staffAttributionMode === "REQUIRED",
  };
}
