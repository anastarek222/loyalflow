export const PUBLIC_ACQUISITION_MODE = "INVITATION_ONLY" as const;

export const PUBLIC_ACQUISITION_PATHS = [
  "EXISTING_ACCOUNT",
  "OWNER_INVITATION",
] as const;

export type PublicAcquisitionPath = (typeof PUBLIC_ACQUISITION_PATHS)[number];

export const publicAcquisitionPolicy = Object.freeze({
  mode: PUBLIC_ACQUISITION_MODE,
  selfServiceSignupEnabled: false,
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
