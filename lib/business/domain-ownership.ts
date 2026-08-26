export const BUSINESS_DOMAIN_FIELDS = {
  BUSINESS_IDENTITY: [
    "name",
    "industry",
    "description",
    "email",
    "contactPhone",
    "website",
    "country",
    "city",
    "address",
    "currency",
    "timezone",
    "taxNumber",
    "employeeCount",
  ],
  LOYALTY_PROGRAM: [
    "loyaltyMode",
    "unitName",
    "earnAmount",
    "rewardThreshold",
    "rewardName",
    "rewardType",
    "rewardCode",
    "rewardDescription",
    "loyaltyProgramName",
  ],
  CARD_DESIGN: [
    "logoUrl",
    "cardDesignMode",
    "primaryColor",
    "secondaryColor",
    "themePreset",
    "standardCardArtworkEnabled",
    "standardCardArtworkCategory",
    "customCardArtworkEnabled",
    "customCardFrontArtworkUrl",
    "customCardBackArtworkUrl",
    "customCardSafeZoneVersion",
  ],
  CUSTOMER_EXPERIENCE: [
    "coverImageUrl",
    "welcomeMessage",
    "instagramUrl",
    "facebookUrl",
    "tiktokUrl",
    "cardDefaultLanguage",
    "cardTerms",
    "qrStyle",
    "qrPosition",
    "whatsappWelcomeMessage",
    "whatsappBalanceMessage",
    "whatsappRewardMessage",
  ],
} as const;

export type LegacyFieldStatus =
  | "ACTIVE_CANONICAL"
  | "ACTIVE_COMPATIBILITY"
  | "DEPRECATED_READ_ONLY"
  | "DEAD_CANDIDATE";

export const LEGACY_BUSINESS_FIELD_CLASSIFICATION = {
  pointsName: "DEPRECATED_READ_ONLY",
  membershipName: "ACTIVE_COMPATIBILITY",
  secondaryColor: "ACTIVE_CANONICAL",
  themePreset: "ACTIVE_CANONICAL",
  cardStyle: "DEPRECATED_READ_ONLY",
  fontFamily: "ACTIVE_COMPATIBILITY",
  backgroundColor: "DEAD_CANDIDATE",
  buttonStyle: "DEAD_CANDIDATE",
  qrPosition: "ACTIVE_COMPATIBILITY",
  qrStyle: "ACTIVE_COMPATIBILITY",
} as const satisfies Record<string, LegacyFieldStatus>;

export const LEGACY_SETTINGS_PROTECTED_FIELDS = [
  "logoUrl",
  "primaryColor",
  "secondaryColor",
  "themePreset",
  "cardStyle",
  "fontFamily",
] as const;

export function pickOwnedFields<
  Source extends Record<string, unknown>,
  Key extends readonly (keyof Source)[],
>(source: Source, fields: Key): Pick<Source, Key[number]> {
  return Object.fromEntries(
    fields.map((field) => [field, source[field]]),
  ) as Pick<Source, Key[number]>;
}
