import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { resolveOwnBusinessApiActor } from "@/lib/api/v1/actor-policy";
import { toApiBusinessSummary } from "@/lib/business/api-summary";

const ownerSession = {
  user: {
    id: "user-owner",
    role: "OWNER" as const,
    businessId: "business-a",
    authVersion: 1,
  },
  expires: "2099-01-01T00:00:00.000Z",
};

test("TC5 second slice derives its tenant only from the authenticated session", () => {
  assert.deepEqual(
    resolveOwnBusinessApiActor({
      session: ownerSession,
      capability: "CUSTOMERS_VIEW",
    }),
    {
      allowed: true,
      actor: {
        userId: "user-owner",
        businessId: "business-a",
        role: "OWNER",
      },
    },
  );
  assert.deepEqual(
    resolveOwnBusinessApiActor({
      session: null,
      capability: "CUSTOMERS_VIEW",
    }),
    { allowed: false, problem: "AUTHENTICATION_REQUIRED" },
  );
  assert.deepEqual(
    resolveOwnBusinessApiActor({
      session: {
        ...ownerSession,
        user: { ...ownerSession.user, role: "SUPER_ADMIN", businessId: null },
      },
      capability: "CUSTOMERS_VIEW",
    }),
    { allowed: false, problem: "RESOURCE_NOT_FOUND" },
  );
  assert.deepEqual(
    resolveOwnBusinessApiActor({
      session: {
        ...ownerSession,
        user: { ...ownerSession.user, role: "VIEWER" },
      },
      capability: "SETTINGS_EDIT",
    }),
    { allowed: false, problem: "CAPABILITY_REQUIRED" },
  );
});

test("TC5 business summary exposes only the approved operational DTO", () => {
  const summary = toApiBusinessSummary({
    id: "business-a",
    name: "North Star",
    slug: "north-star",
    isActive: true,
    loyaltyMode: "VISITS",
    unitName: "Visit",
    rewardName: "Reward",
    rewardThreshold: 5,
    _count: { customers: 12, branches: 2 },
  });

  assert.deepEqual(summary, {
    business: {
      id: "business-a",
      name: "North Star",
      slug: "north-star",
      isActive: true,
    },
    program: {
      loyaltyMode: "VISITS",
      unitName: "Visit",
      rewardName: "Reward",
      rewardThreshold: 5,
    },
    counts: { customers: 12, branches: 2 },
  });
  assert.doesNotMatch(
    JSON.stringify(summary),
    /password|token|secret|email|phone|address|billing|adminNotes|stack|Prisma/i,
  );
});

test("TC5 business summary route is read-only, session-scoped, and fail-closed", async () => {
  const [route, query] = await Promise.all([
    readFile("app/api/v1/business/summary/route.ts", "utf8"),
    readFile("lib/business/api-summary-query.ts", "utf8"),
  ]);

  assert.match(route, /export async function GET\(request: Request\)/);
  assert.doesNotMatch(route, /export async function (POST|PUT|PATCH|DELETE)/);
  assert.match(route, /resolveOwnBusinessRead\(request, "CUSTOMERS_VIEW"\)/);
  assert.doesNotMatch(route, /searchParams|params|tenantId|slug/);
  assert.match(route, /internalApiProblem\(requestId\)/);
  assert.match(query, /where: \{ id: businessId \}/);
  assert.doesNotMatch(query, /\.create|\.update|\.upsert|\.delete|\$transaction/);
  assert.doesNotMatch(query, /email|phone|address|billing|adminNotes/);
});
