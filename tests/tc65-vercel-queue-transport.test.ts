import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  parseIntegrationJobMessage,
  publishIntegrationJob,
  type IntegrationJobMessage,
  type IntegrationJobTransport,
} from "@/lib/server/integrations/transport";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("TC6.5 domain-facing publication stays provider-neutral and job-id only", async () => {
  const published: IntegrationJobMessage[] = [];
  const transport: IntegrationJobTransport = {
    async publish(message) {
      published.push(message);
    },
  };

  await publishIntegrationJob({ jobId: "job-1" }, transport);
  assert.deepEqual(published, [{ jobId: "job-1" }]);
  assert.deepEqual(parseIntegrationJobMessage({ jobId: "job-1" }), {
    jobId: "job-1",
  });
  assert.throws(() => parseIntegrationJobMessage({ businessId: "tenant-a" }));
  assert.throws(() => parseIntegrationJobMessage({ jobId: { id: "job-1" } }));
});

test("TC6.5 source enqueue is transactional and Queue only wakes the consumer", () => {
  const owner = source("app/onboarding/actions.ts");
  const admin = source("app/businesses/actions.ts");
  const scheduler = source("lib/google-sheets-sync-scheduler.ts");
  const transport = source("lib/server/integrations/transport.ts");
  const consumer = source("app/api/queues/integration-jobs/route.ts");
  const config = source("vercel.json");

  assert.match(owner, /await enqueueIntegrationJob\(tx/);
  assert.match(admin, /await enqueueIntegrationJob\(transaction/);
  assert.match(scheduler, /publishIntegrationJob\(\{ jobId \}\)/);
  assert.match(transport, /idempotencyKey: `integration-job:\$\{jobId\}`/);
  assert.doesNotMatch(transport, /businessId|customerId|payload/);
  assert.match(consumer, /handleCallback<IntegrationJobMessage>/);
  assert.match(config, /queue\/v2beta/);
});
