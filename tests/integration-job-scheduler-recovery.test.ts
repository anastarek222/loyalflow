import assert from "node:assert/strict";
import test from "node:test";

import { publishIntegrationJobWithRecovery } from "../lib/integration-job-scheduler";

test("integration scheduler keeps the normal Queue publication path unchanged", async () => {
  const calls: string[] = [];

  const result = await publishIntegrationJobWithRecovery("job-normal", {
    async publishJob(message) {
      calls.push(`publish:${message.jobId}`);
    },
    async scheduleRecoveryHeartbeat() {
      calls.push("heartbeat");
    },
    async processJob() {
      calls.push("process");
    },
    logError(event) {
      calls.push(`log:${event}`);
    },
    createDeliveryId() {
      return "delivery-normal";
    },
  });

  assert.deepEqual(result, {
    published: true,
    recoveryHeartbeatScheduled: false,
    inlineFallbackCompleted: false,
  });
  assert.deepEqual(calls, ["publish:job-normal"]);
});

test("integration scheduler seeds recovery and runs the durable worker when initial publish fails", async () => {
  const calls: string[] = [];

  const result = await publishIntegrationJobWithRecovery("job-recover", {
    async publishJob() {
      calls.push("publish");
      throw new Error("queue unavailable");
    },
    async scheduleRecoveryHeartbeat() {
      calls.push("heartbeat");
    },
    async processJob(jobId, deliveryId) {
      calls.push(`process:${jobId}:${deliveryId}`);
    },
    logError(event) {
      calls.push(`log:${event}`);
    },
    createDeliveryId() {
      return "delivery-recover";
    },
  });

  assert.deepEqual(result, {
    published: false,
    recoveryHeartbeatScheduled: true,
    inlineFallbackCompleted: true,
  });
  assert.deepEqual(calls, [
    "publish",
    "log:integration_job_publish_failed",
    "heartbeat",
    "process:job-recover:inline-fallback:delivery-recover",
  ]);
});

test("integration scheduler leaves the durable job recoverable when both fallback paths fail", async () => {
  const loggedEvents: string[] = [];

  const result = await publishIntegrationJobWithRecovery("job-durable", {
    async publishJob() {
      throw new Error("queue publish failed");
    },
    async scheduleRecoveryHeartbeat() {
      throw new Error("recovery queue unavailable");
    },
    async processJob() {
      throw new Error("retryable provider failure");
    },
    logError(event) {
      loggedEvents.push(event);
    },
    createDeliveryId() {
      return "delivery-durable";
    },
  });

  assert.deepEqual(result, {
    published: false,
    recoveryHeartbeatScheduled: false,
    inlineFallbackCompleted: false,
  });
  assert.deepEqual(loggedEvents, [
    "integration_job_publish_failed",
    "integration_recovery_heartbeat_seed_failed",
    "integration_job_inline_fallback_failed",
  ]);
});
