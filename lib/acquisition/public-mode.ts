export const PUBLIC_ACQUISITION_MODE = "PUBLIC_TRIAL" as const;

export const PUBLIC_ACQUISITION_PATHS = [
  "NEW_BUSINESS",
  "EXISTING_ACCOUNT",
] as const;

export type PublicAcquisitionPath = (typeof PUBLIC_ACQUISITION_PATHS)[number];

export const publicAcquisitionPolicy = Object.freeze({
  mode: PUBLIC_ACQUISITION_MODE,
  selfServiceSignupEnabled: true,
  paymentCheckoutEnabled: false,
  realParticipantGateRequiredBeforeProduction: true,
});

export function isSupportedPublicAcquisitionPath(
  value: unknown,
): value is PublicAcquisitionPath {
  return (
    typeof value === "string" &&
    PUBLIC_ACQUISITION_PATHS.includes(value as PublicAcquisitionPath)
  );
}
