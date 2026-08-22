import { send } from "@/lib/server/integrations/queue-client";

import {
  BETA_RECONCILIATION_TRIGGER_INTERVAL_MS,
  BETA_RECONCILIATION_TRIGGER_LIMIT,
} from "@/lib/server/integrations/reconciliation-trigger-policy";
import { runStrandedIntegrationJobReconciliation } from "@/lib/server/integrations/reconciliation-runner";

export const INTEGRATION_RECOVERY_HEARTBEAT_TOPIC =
  "loyalflow-integration-recovery-beta";

export type IntegrationRecoveryHeartbeatMessage = Readonly<{
  scheduledForMs: number;
}>;

function requireValidNow(now: Date) {
  const nowMs = now.getTime();
  if (!Number.isFinite(nowMs)) throw new Error("now must be a valid date.");
  return nowMs;
}

export async function scheduleNextIntegrationRecoveryHeartbeat(
  now: Date = new Date(),
) {
  const nowMs = requireValidNow(now);
  const scheduledForMs = nowMs + BETA_RECONCILIATION_TRIGGER_INTERVAL_MS;
  const bucket = Math.floor(
    scheduledForMs / BETA_RECONCILIATION_TRIGGER_INTERVAL_MS,
  );

  await send(
    INTEGRATION_RECOVERY_HEARTBEAT_TOPIC,
    { scheduledForMs } satisfies IntegrationRecoveryHeartbeatMessage,
    {
      delaySeconds: BETA_RECONCILIATION_TRIGGER_INTERVAL_MS / 1000,
      idempotencyKey: `integration-recovery-heartbeat:${bucket}`,
    },
  );
}

export function parseIntegrationRecoveryHeartbeatMessage(
  value: unknown,
): IntegrationRecoveryHeartbeatMessage {
  if (
    !value ||
    typeof value !== "object" ||
    !("scheduledForMs" in value) ||
    typeof value.scheduledForMs !== "number" ||
    !Number.isFinite(value.scheduledForMs)
  ) {
    throw new Error("Invalid integration recovery heartbeat message.");
  }
  return { scheduledForMs: value.scheduledForMs };
}

export async function processIntegrationRecoveryHeartbeat(now: Date = new Date()) {
  requireValidNow(now);
  await scheduleNextIntegrationRecoveryHeartbeat(now);
  return runStrandedIntegrationJobReconciliation({
    now,
    limit: BETA_RECONCILIATION_TRIGGER_LIMIT,
  });
}
