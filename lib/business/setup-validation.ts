import { businessCreationSchema } from "@/lib/business/creation-input";

export const BUSINESS_SETUP_FIELD_STEP = {
  name: 0,
  contactPhone: 0,
  industry: 0,
  currency: 0,
  timezone: 0,
  employeeCount: 0,
  email: 0,
  country: 0,
  city: 0,
  website: 0,
  taxNumber: 0,

  ownerFirstName: 1,
  ownerLastName: 1,
  ownerEmail: 1,
  ownerPhone: 1,
  ownerPassword: 1,

  plan: 2,
  billingInterval: 2,
  billingCustomDays: 2,
  subscriptionStartDate: 2,
  nextPaymentDate: 2,
  lastPaymentDate: 2,
  subscriptionAmount: 2,
  billingCurrency: 2,
  paymentStatus: 2,
  gracePeriodDays: 2,
  paymentMethod: 2,
  billingNotes: 2,
  adminNotes: 2,

  loyaltyMode: 3,
  unitName: 3,
  rewardName: 3,
  rewardThreshold: 3,
  earnAmount: 3,

  logoUrl: 4,
  logoDataUrl: 4,
  primaryColor: 4,
  secondaryColor: 4,
  themePreset: 4,
  cardStyle: 4,
  fontFamily: 4,
  standardCardArtworkEnabled: 4,
  standardCardArtworkCategory: 4,
  cardDesignMode: 4,
  customCardArtworkEnabled: 4,
  customCardFrontArtworkUrl: 4,
  customCardBackArtworkUrl: 4,
  customCardSafeZoneVersion: 4,
} as const satisfies Record<string, 0 | 1 | 2 | 3 | 4>;

export type BusinessSetupField = keyof typeof BUSINESS_SETUP_FIELD_STEP;

export type BusinessSetupValidationIssue = {
  field: BusinessSetupField;
  step: 0 | 1 | 2 | 3 | 4;
  message: string;
};

export function getBusinessSetupFieldStep(field: string) {
  return Object.hasOwn(BUSINESS_SETUP_FIELD_STEP, field)
    ? BUSINESS_SETUP_FIELD_STEP[field as BusinessSetupField]
    : 0;
}

export function getBusinessSetupValidationIssue(
  formData: FormData,
  maxStep?: 0 | 1 | 2 | 3 | 4,
): BusinessSetupValidationIssue | null {
  const parsed = businessCreationSchema.safeParse(Object.fromEntries(formData));
  if (parsed.success) return null;

  for (const issue of parsed.error.issues) {
    const field = String(issue.path[0] ?? "") as BusinessSetupField;
    if (!Object.hasOwn(BUSINESS_SETUP_FIELD_STEP, field)) continue;
    const step = BUSINESS_SETUP_FIELD_STEP[field];
    if (maxStep !== undefined && step > maxStep) continue;
    return { field, step, message: issue.message };
  }

  return null;
}
