export type OperationalSeverity = "healthy" | "attention" | "critical";

export type OperationalSnapshotInput = Readonly<{
  totalBusinesses: number;
  activeBusinesses: number;
  suspendedBusinesses: number;
  overdueSubscriptions: number;
  dueSoonSubscriptions: number;
  loyaltyActions24h: number;
}>;

export function deriveOperationalSeverity(
  input: OperationalSnapshotInput,
): OperationalSeverity {
  if (
    input.totalBusinesses > 0 &&
    input.activeBusinesses === 0
  ) {
    return "critical";
  }

  if (
    input.suspendedBusinesses > 0 ||
    input.overdueSubscriptions > 0
  ) {
    return "attention";
  }

  return "healthy";
}

export function operationalStatusLabel(
  severity: OperationalSeverity,
  language: "AR" | "EN",
) {
  const copy = {
    AR: {
      healthy: "مستقر",
      attention: "يحتاج متابعة",
      critical: "حرج",
    },
    EN: {
      healthy: "Healthy",
      attention: "Needs attention",
      critical: "Critical",
    },
  } as const;

  return copy[language][severity];
}
