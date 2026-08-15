import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  claimIntegrationJob,
  completeIntegrationJob,
  enqueueIntegrationJob,
  failIntegrationJob,
  type IntegrationJobStore,
} from "@/lib/server/integrations/outbox";

type Job = {
  id: string;
  businessId: string;
  kind: "GOOGLE_SHEETS_BUSINESS_SYNC";
  idempotencyKey: string;
  status: "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "DEAD";
  attemptCount: number;
  availableAt: Date;
  leaseOwner: string | null;
  leaseExpiresAt: Date | null;
  lastAttemptAt: Date | null;
  lastErrorCode: string | null;
  completedAt: Date | null;
};

function createStore() {
  const jobs: Job[] = [];
  const integrationJob = {
    async upsert(rawInput: unknown) {
      const input = rawInput as {
        where: {
          businessId_kind_idempotencyKey: {
            businessId: string;
            kind: Job["kind"];
            idempotencyKey: string;
          };
        };
        create: Pick<Job, "businessId" | "kind" | "idempotencyKey"> & {
          availableAt?: Date;
        };
      };
      const key = input.where.businessId_kind_idempotencyKey;
      const existing = jobs.find(
        (job) =>
          job.businessId === key.businessId &&
          job.kind === key.kind &&
          job.idempotencyKey === key.idempotencyKey,
      );
      if (existing) return { ...existing };
      const created: Job = {
        id: `job-${jobs.length + 1}`,
        ...input.create,
        status: "PENDING",
        attemptCount: 0,
        availableAt: input.create.availableAt ?? new Date(0),
        leaseOwner: null,
        leaseExpiresAt: null,
        lastAttemptAt: null,
        lastErrorCode: null,
        completedAt: null,
      };
      jobs.push(created);
      return { ...created };
    },
    async updateMany(rawInput: unknown) {
      const input = rawInput as {
        where: {
          id: string;
          status: Job["status"] | { in: Job["status"][] };
          availableAt?: { lte: Date };
          OR?: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lte: Date } }];
          leaseOwner?: string;
        };
        data: Partial<Omit<Job, "attemptCount">> & {
          attemptCount?: { increment: number };
        };
      };
      const job = jobs.find((candidate) => candidate.id === input.where.id);
      if (
        !job ||
        (job.status !== "PROCESSING" && input.where.status === "PROCESSING")
      ) {
        return { count: 0 };
      }
      if (typeof input.where.status !== "string") {
        if (!input.where.status.in.includes(job.status)) return { count: 0 };
        if (job.availableAt > input.where.availableAt!.lte) return { count: 0 };
        if (
          job.leaseExpiresAt &&
          job.leaseExpiresAt > input.where.OR![1].leaseExpiresAt.lte
        ) {
          return { count: 0 };
        }
      }
      if (input.where.leaseOwner && job.leaseOwner !== input.where.leaseOwner) {
        return { count: 0 };
      }
      if (input.data.attemptCount) {
        job.attemptCount += input.data.attemptCount.increment;
      }
      if (input.data.status !== undefined) job.status = input.data.status;
      if (input.data.availableAt !== undefined) job.availableAt = input.data.availableAt;
      if (input.data.leaseOwner !== undefined) job.leaseOwner = input.data.leaseOwner;
      if (input.data.leaseExpiresAt !== undefined) job.leaseExpiresAt = input.data.leaseExpiresAt;
      if (input.data.lastAttemptAt !== undefined) job.lastAttemptAt = input.data.lastAttemptAt;
      if (input.data.lastErrorCode !== undefined) job.lastErrorCode = input.data.lastErrorCode;
      if (input.data.completedAt !== undefined) job.completedAt = input.data.completedAt;
      return { count: 1 };
    },
    async findUnique(rawInput: unknown) {
      const input = rawInput as { where: { id: string } };
      return jobs.find((job) => job.id === input.where.id) ?? null;
    },
  };
  return {
    jobs,
    store: { integrationJob } as unknown as IntegrationJobStore,
  };
}

test("TC6.4 enqueue is business-scoped and idempotent without resetting state", async () => {
  const store = createStore();
  const input = {
    businessId: "business-a",
    kind: "GOOGLE_SHEETS_BUSINESS_SYNC" as const,
    idempotencyKey: "customer-update:customer-a:revision-2",
  };
  const first = await enqueueIntegrationJob(store.store, input);
  store.jobs[0]!.attemptCount = 2;
  const replay = await enqueueIntegrationJob(store.store, input);

  assert.equal(first.id, replay.id);
  assert.equal(store.jobs.length, 1);
  assert.equal(replay.attemptCount, 2);

  await enqueueIntegrationJob(store.store, { ...input, businessId: "business-b" });
  assert.equal(store.jobs.length, 2);
});
test("TC6.4 claim uses an atomic lease and increments attempts once", async () => {
  const store = createStore();
  const job = await enqueueIntegrationJob(store.store, {
    businessId: "business-a",
    kind: "GOOGLE_SHEETS_BUSINESS_SYNC",
    idempotencyKey: "sync-1",
  });
  const now = new Date("2026-08-14T18:00:00.000Z");
  const leaseExpiresAt = new Date("2026-08-14T18:05:00.000Z");

  const claim = await claimIntegrationJob(store.store, {
    jobId: job.id,
    workerId: "worker-a",
    now,
    leaseExpiresAt,
  });
  const duplicateClaim = await claimIntegrationJob(store.store, {
    jobId: job.id,
    workerId: "worker-b",
    now,
    leaseExpiresAt,
  });

  assert.equal(claim?.status, "PROCESSING");
  assert.equal(claim?.attemptCount, 1);
  assert.equal(duplicateClaim, null);
});

test("TC6.4 completion and failure require lease ownership", async () => {
  const store = createStore();
  const job = await enqueueIntegrationJob(store.store, {
    businessId: "business-a",
    kind: "GOOGLE_SHEETS_BUSINESS_SYNC",
    idempotencyKey: "sync-2",
  });
  const now = new Date("2026-08-14T18:00:00.000Z");
  await claimIntegrationJob(store.store, {
    jobId: job.id,
    workerId: "worker-a",
    now,
    leaseExpiresAt: new Date("2026-08-14T18:05:00.000Z"),
  });

  assert.equal(
    (await completeIntegrationJob(store.store, {
      jobId: job.id,
      workerId: "worker-b",
      completedAt: now,
    })).count,
    0,
  );
  assert.equal(
    (await failIntegrationJob(store.store, {
      jobId: job.id,
      workerId: "worker-a",
      failedAt: now,
      errorCode: "GOOGLE_API_FAILED",
      retryAt: new Date("2026-08-14T18:10:00.000Z"),
    })).count,
    1,
  );
  assert.equal(store.jobs[0]!.status, "FAILED");
  assert.equal(store.jobs[0]!.leaseOwner, null);
});

test("TC6.4 rejects malformed identities and caller-supplied invalid timing", async () => {
  const store = createStore();
  await assert.rejects(
    enqueueIntegrationJob(store.store, {
      businessId: " ",
      kind: "GOOGLE_SHEETS_BUSINESS_SYNC",
      idempotencyKey: "sync-3",
    }),
    /businessId/,
  );
  await assert.rejects(
    claimIntegrationJob(store.store, {
      jobId: "job-1",
      workerId: "worker-a",
      now: new Date("2026-08-14T18:00:00.000Z"),
      leaseExpiresAt: new Date("2026-08-14T18:00:00.000Z"),
    }),
    /leaseExpiresAt/,
  );

  const job = await enqueueIntegrationJob(store.store, {
    businessId: "business-a",
    kind: "GOOGLE_SHEETS_BUSINESS_SYNC",
    idempotencyKey: "sync-4",
  });
  await claimIntegrationJob(store.store, {
    jobId: job.id,
    workerId: "worker-a",
    now: new Date("2026-08-14T18:00:00.000Z"),
    leaseExpiresAt: new Date("2026-08-14T18:05:00.000Z"),
  });
  await assert.rejects(
    failIntegrationJob(store.store, {
      jobId: job.id,
      workerId: "worker-a",
      failedAt: new Date("2026-08-14T18:01:00.000Z"),
      errorCode: "raw provider response must not be stored",
      retryAt: null,
    }),
    /safe machine-readable code/,
  );
});

test("TC6.4 migration remains additive after the bounded Beta transport activation", () => {
  const migration = readFileSync(
    new URL(
      "../prisma/migrations/20260814213000_add_integration_outbox_jobs/migration.sql",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(migration, /CREATE TABLE "IntegrationJob"/);
  assert.match(
    migration,
    /UNIQUE INDEX "IntegrationJob_businessId_kind_idempotencyKey_key"/,
  );
  assert.match(migration, /FOREIGN KEY \("businessId"\)/);
  assert.doesNotMatch(migration, /DROP\s|TRUNCATE\s|DELETE\sFROM|ALTER\s+COLUMN/i);
});
