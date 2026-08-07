import assert from "node:assert/strict";
import test from "node:test";

import type { PrismaClient } from "../generated/prisma/client";
import {
  buildOpenReversalExceptionWhere,
  countOpenReversalExceptions,
} from "../lib/loyalty/reversal-exception-reporting";

const from = new Date("2026-08-01T00:00:00.000Z");
const to = new Date("2026-08-07T23:59:59.999Z");

test("open reversal exception reporting is tenant scoped and counts only unresolved insufficient-balance blockers", () => {
  assert.deepEqual(
    buildOpenReversalExceptionWhere({ businessId: "business-1" }),
    {
      businessId: "business-1",
      status: "OPEN",
      blockReason: "INSUFFICIENT_BALANCE",
    },
  );
});

test("open reversal exception reporting preserves date branch staff and customer report scope", () => {
  const customerWhere = {
    businessId: "business-1",
    isActive: true,
  } as const;

  assert.deepEqual(
    buildOpenReversalExceptionWhere({
      businessId: "business-1",
      from,
      to,
      branchId: "branch-1",
      attributedStaffId: "staff-1",
      customerWhere,
    }),
    {
      businessId: "business-1",
      status: "OPEN",
      blockReason: "INSUFFICIENT_BALANCE",
      createdAt: { gte: from, lte: to },
      branchId: "branch-1",
      attributedStaffId: "staff-1",
      customer: customerWhere,
    },
  );
});

test("count helper performs one read-only count with the canonical open-exception predicate", async () => {
  const calls: unknown[] = [];
  const client = {
    reversalException: {
      count: async (args: unknown) => {
        calls.push(args);
        return 3;
      },
    },
  } as unknown as Pick<PrismaClient, "reversalException">;

  const count = await countOpenReversalExceptions(client, {
    businessId: "business-1",
    from,
    to,
  });

  assert.equal(count, 3);
  assert.deepEqual(calls, [
    {
      where: {
        businessId: "business-1",
        status: "OPEN",
        blockReason: "INSUFFICIENT_BALANCE",
        createdAt: { gte: from, lte: to },
      },
    },
  ]);
});
