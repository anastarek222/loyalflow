import type { IntegrationExecutionStatus } from "@loyalflow/contracts/integrations/health";

export type IntegrationHealthGroup = Readonly<{
  syncState: unknown;
  retryable: unknown;
  count: unknown;
}>;

export type IntegrationRuntimeHealthSnapshot = Readonly<{
  total: number;
  statusCounts: Readonly<Record<IntegrationExecutionStatus, number>>;
  failureCounts: Readonly<{ retryable: number; terminal: number }>;
}>;

function isCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === "number" && value >= 0;
}

/**
 * Converts privacy-minimized database groups into a provider-neutral status
 * snapshot. Pending aging is deliberately excluded until a canonical
 * pending-start timestamp and thresholds are approved.
 */
export function summarizeIntegrationRuntimeHealth(
  groups: readonly IntegrationHealthGroup[],
): IntegrationRuntimeHealthSnapshot | null {
  const statusCounts: Record<IntegrationExecutionStatus, number> = {
    PENDING: 0,
    SUCCEEDED: 0,
    FAILED: 0,
  };
  const failureCounts = { retryable: 0, terminal: 0 };
  let total = 0;

  for (const group of groups) {
    if (
      !isCount(group.count) ||
      (group.syncState !== "PENDING" &&
        group.syncState !== "SUCCEEDED" &&
        group.syncState !== "FAILED")
    ) {
      return null;
    }
    if (group.syncState === "FAILED" && typeof group.retryable !== "boolean") {
      return null;
    }

    statusCounts[group.syncState] += group.count;
    total += group.count;
    if (group.syncState === "FAILED") {
      failureCounts[group.retryable ? "retryable" : "terminal"] += group.count;
    }
  }

  return { total, statusCounts, failureCounts };
}
