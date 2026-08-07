import assert from "node:assert/strict";
import test from "node:test";

import type { Prisma } from "../generated/prisma/client";
import { resolveReversalException } from "../lib/loyalty/reversal-exception-resolution";
import { isFinancialOperationContextError } from "../lib/loyalty/transactions";

const owner = {
  id: "owner-1",
  role: "OWNER" as const,
  businessId: "business-1",
};

const input = {
  businessId: "business-1",
  exceptionId: "exception-1",
  actor: owner,
  resolutionNote: "Customer balance was corrected through a separate approved process.",
};

type ExceptionRecord = {
  id: string;
  status: "OPEN" | "RESOLVED";
  resolvedAt: Date | null;
  resolutionNote: string | null;
};

function createTransaction(options: {
  locked?: boolean;
  exception?: ExceptionRecord | null;
  updateCount?: number;
} = {}) {
  const updates: unknown[] = [];

  const transaction = {
    $queryRaw: async () =>
      options.locked === false ? [] : [{ id: "exception-1" }],
    reversalException: {
      findFirst: async () =>
        options.exception === undefined
          ? {
              id: "exception-1",
              status: "OPEN" as const,
              resolvedAt: null,
              resolutionNote: null,
            }
          : options.exception,
      updateMany: async (args: unknown) => {
        updates.push(args);
        return { count: options.updateCount ?? 1 };
      },
    },
  } as unknown as Prisma.TransactionClient;

  return { transaction, updates };
}

test("owner resolves one same-tenant open exception without creating financial writes", async () => {
  const { transaction, updates } = createTransaction();

  const result = await resolveReversalException(transaction, input);

  assert.equal(result.status, "APPLIED");
  assert.equal(result.exceptionId, "exception-1");
  assert.ok(result.resolvedAt instanceof Date);
  assert.equal(updates.length, 1);

  assert.deepEqual(updates[0], {
    where: {
      id: "exception-1",
      businessId: "business-1",
      status: "OPEN",
    },
    data: {
      status: "RESOLVED",
      resolvedAt: result.resolvedAt,
      resolutionNote:
        "Customer balance was corrected through a separate approved process.",
    },
  });
});

test("manager cannot resolve reversal exceptions", async () => {
  const { transaction, updates } = createTransaction();

  await assert.rejects(
    () =>
      resolveReversalException(transaction, {
        ...input,
        actor: {
          id: "manager-1",
          role: "MANAGER",
          businessId: "business-1",
        },
      }),
    (error: unknown) => {
      assert.ok(isFinancialOperationContextError(error));
      assert.equal(error.reason, "ACTOR_NOT_ALLOWED");
      return true;
    },
  );

  assert.equal(updates.length, 0);
});

test("owner from another tenant cannot resolve the exception", async () => {
  const { transaction, updates } = createTransaction();

  await assert.rejects(
    () =>
      resolveReversalException(transaction, {
        ...input,
        actor: {
          id: "owner-2",
          role: "OWNER",
          businessId: "business-2",
        },
      }),
    (error: unknown) => {
      assert.ok(isFinancialOperationContextError(error));
      assert.equal(error.reason, "ACTOR_NOT_ALLOWED");
      return true;
    },
  );

  assert.equal(updates.length, 0);
});

test("missing or cross-tenant exception is blocked before any update", async () => {
  const { transaction, updates } = createTransaction({ locked: false });

  const result = await resolveReversalException(transaction, input);

  assert.deepEqual(result, {
    status: "BLOCKED",
    reason: "EXCEPTION_NOT_FOUND",
  });
  assert.equal(updates.length, 0);
});

test("same resolution note replays a resolved exception idempotently", async () => {
  const resolvedAt = new Date("2026-08-07T17:00:00.000Z");
  const { transaction, updates } = createTransaction({
    exception: {
      id: "exception-1",
      status: "RESOLVED",
      resolvedAt,
      resolutionNote:
        "Customer balance was corrected through a separate approved process.",
    },
  });

  const result = await resolveReversalException(transaction, input);

  assert.deepEqual(result, {
    status: "REPLAYED",
    exceptionId: "exception-1",
    resolvedAt,
  });
  assert.equal(updates.length, 0);
});

test("resolved exception cannot have its resolution note rewritten", async () => {
  const { transaction, updates } = createTransaction({
    exception: {
      id: "exception-1",
      status: "RESOLVED",
      resolvedAt: new Date("2026-08-07T17:00:00.000Z"),
      resolutionNote: "Previously approved resolution",
    },
  });

  const result = await resolveReversalException(transaction, input);

  assert.deepEqual(result, {
    status: "BLOCKED",
    reason: "ALREADY_RESOLVED",
  });
  assert.equal(updates.length, 0);
});

test("resolution note is mandatory and bounded", async () => {
  const { transaction, updates } = createTransaction();

  await assert.rejects(
    () =>
      resolveReversalException(transaction, {
        ...input,
        resolutionNote: "   ",
      }),
    /Resolution note must contain 1 to 500 characters/,
  );

  assert.equal(updates.length, 0);
});
