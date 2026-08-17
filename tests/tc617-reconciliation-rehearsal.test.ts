import assert from "node:assert/strict";
import test from "node:test";

import { reconcileStrandedIntegrationJobs } from "@/lib/server/integrations/reconciliation";

test("TC6.17 rehearses bounded stranded-job wake-up without durable-state mutation", async () => {
  const now = new Date("2026-08-17T12:00:00.000Z");
  let observedQuery: unknown;
  const store = {
    integrationJob: {
      async findMany(query: unknown) {
        observedQuery = query;
        return [{ id: "job-a" }, { id: "job-b" }, { id: "job-c" }];
      },
    },
  } as never;

  const published: string[] = [];
  const result = await reconcileStrandedIntegrationJobs(
    store,
    { now, limit: 3 },
    async ({ jobId }) => {
      published.push(jobId);
    },
  );

  assert.deepEqual(published, ["job-a", "job-b", "job-c"]);
  assert.deepEqual(result, { scanned: 3, published: 3, failedJobIds: [] });
  assert.deepEqual(observedQuery, {
    where: {
      availableAt: { lte: now },
      OR: [
        {
          status: { in: ["PENDING", "FAILED"] },
          OR: [
            { leaseExpiresAt: null },
            { leaseExpiresAt: { lte: now } },
          ],
        },
        { status: "PROCESSING", leaseExpiresAt: { lte: now } },
      ],
    },
    orderBy: [{ availableAt: "asc" }, { createdAt: "asc" }],
    take: 3,
    select: { id: true },
  });
});

test("TC6.17 isolates publication failures and keeps replay job-id only", async () => {
  const store = {
    integrationJob: {
      async findMany() {
        return [{ id: "job-a" }, { id: "job-b" }, { id: "job-c" }];
      },
    },
  } as never;

  const attempts: string[] = [];
  const result = await reconcileStrandedIntegrationJobs(
    store,
    { now: new Date("2026-08-17T12:00:00.000Z") },
    async ({ jobId }) => {
      attempts.push(jobId);
      if (jobId === "job-b") throw new Error("simulated transport failure");
    },
  );

  assert.deepEqual(attempts, ["job-a", "job-b", "job-c"]);
  assert.deepEqual(result, {
    scanned: 3,
    published: 2,
    failedJobIds: ["job-b"],
  });
});

test("TC6.17 rejects an unbounded rehearsal before reading durable jobs", async () => {
  let reads = 0;
  const store = {
    integrationJob: {
      async findMany() {
        reads += 1;
        return [];
      },
    },
  } as never;

  await assert.rejects(
    reconcileStrandedIntegrationJobs(store, {
      now: new Date("2026-08-17T12:00:00.000Z"),
      limit: 101,
    }),
  );
  assert.equal(reads, 0);
});
