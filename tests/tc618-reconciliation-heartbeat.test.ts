import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("TC6.18 keeps the beta heartbeat delayed, bounded, and idempotent", () => {
  const heartbeat = source("lib/server/integrations/reconciliation-heartbeat.ts");

  assert.match(heartbeat, /BETA_RECONCILIATION_TRIGGER_INTERVAL_MS/);
  assert.match(heartbeat, /BETA_RECONCILIATION_TRIGGER_LIMIT/);
  assert.match(heartbeat, /delaySeconds: BETA_RECONCILIATION_TRIGGER_INTERVAL_MS \/ 1000/);
  assert.match(heartbeat, /integration-recovery-heartbeat:\$\{bucket\}/);
  assert.match(heartbeat, /scheduleNextIntegrationRecoveryHeartbeat\(now\)/);
  assert.match(heartbeat, /runStrandedIntegrationJobReconciliation\(\{/);
});

test("TC6.18 registers an internal queue consumer instead of a public scheduler route", () => {
  const config = source("vercel.json");
  const route = source("app/api/queues/integration-recovery/route.ts");

  assert.match(config, /app\/api\/queues\/integration-recovery\/route\.ts/);
  assert.match(config, /loyalflow-integration-recovery-beta/);
  assert.match(config, /queue\/v2beta/);
  assert.match(route, /handleCallback<IntegrationRecoveryHeartbeatMessage>/);
  assert.doesNotMatch(route, /GET\(|CRON_SECRET|process\.env|auth\(|session/i);
});

test("TC6.18 seeds recovery from normal integration queue traffic", () => {
  const jobsRoute = source("app/api/queues/integration-jobs/route.ts");

  assert.match(jobsRoute, /scheduleNextIntegrationRecoveryHeartbeat\(\)/);
  assert.match(jobsRoute, /processIntegrationJob\(jobId, metadata\.messageId\)/);
  assert.doesNotMatch(jobsRoute, /setInterval|setTimeout|cron/i);
});
