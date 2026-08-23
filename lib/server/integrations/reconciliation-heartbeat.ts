import { send } from "@/lib/server/integrations/queue-client";

import {
  BETA_RECONCILIATION_TRIGGER_INTERVAL_MS,
  BETA_RECONCILIATION_TRIGGER_LIMIT,
} from "@/lib/server/integrations/reconciliation-trigger-policy";
import { runStrandedIntegrationJobReconciliation } from "@/lib/server/integrations/reconciliation-runner";

export const INTEGRATION_RECOVERY_HEARTBEAT_TOPIC =
  "loyalflow-integration-recovery-beta";
export const BETA_RECONCILIATION_FOLLOW_UP_PASSES = 1;

export type IntegrationRecoveryHeartbeatMessage = Readonly<{
  scheduledForMs: number;
  remainingPasses: number;
}>;

function requireValidNow(now: Date) {
  const nowMs = now.getTime();
  if (!Number.isFinite(nowMs)) throw new Error("now must be a valid date.");
  return nowMs;
}

function requireValidRemainingPasses(value: number) {
  if (
    !Number.isInteger(value) ||
    value < 0 ||
    value > BETA_RECONCILIATION_FOLLOW_UP_PASSES
  ) {
    throw new Error("remainingPasses must be within the beta recovery budget.");
  }
  return value;
}

export async function scheduleNextIntegrationRecoveryHeartbeat(
  now: Date = new Date(),
  remainingPasses: number = BETA_RECONCILIATION_FOLLOW_UP_PASSES,
) {
  const nowMs = requireValidNow(now);
  const boundedRemainingPasses = requireValidRemainingPasses(remainingPasses);
  const scheduledForMs = nowMs + BETA_RECONCILIATION_TRIGGER_INTERVAL_MS;
  const bucket = Math.floor(
    scheduledForMs / BETA_RECONCILIATION_TRIGGER_INTERVAL_MS,
  );

  await send(
    INTEGRATION_RECOVERY_HEARTBEAT_TOPIC,
    {
      scheduledForMs,
      remainingPasses: boundedRemainingPasses,
    } satisfies IntegrationRecoveryHeartbeatMessage,
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

  const remainingPasses =
    "remainingPasses" in value && typeof value.remainingPasses === "number"
      ? value.remainingPasses
      : BETA_RECONCILIATION_FOLLOW_UP_PASSES;

  return {
    scheduledForMs: value.scheduledForMs,
    remainingPasses: requireValidRemainingPasses(remainingPasses),
  };
}

export async function processIntegrationRecoveryHeartbeat(
  message: IntegrationRecoveryHeartbeatMessage,
  now: Date = new Date(),
) {
  requireValidNow(now);
  requireValidRemainingPasses(message.remainingPasses);

  if (message.remainingPasses > 0) {
    await scheduleNextIntegrationRecoveryHeartbeat(
      now,
      message.remainingPasses - 1,
    );
  }

  return runStrandedIntegrationJobReconciliation({
    now,
    limit: BETA_RECONCILIATION_TRIGGER_LIMIT,
  });
}
