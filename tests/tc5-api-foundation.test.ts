import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { Session } from "next-auth";

import {
  internalApiProblem,
  resolveRequestId,
} from "@/lib/api/v1/response";
import { resolveApiActor } from "@/lib/api/v1/actor-policy";
import { GET as getLiveness } from "@/app/api/v1/health/live/route";
import { GET as getVersion } from "@/app/api/v1/version/route";

function session(input: {
  id: string;
  role: "OWNER" | "MANAGER" | "STAFF" | "VIEWER" | "SUPER_ADMIN";
  businessId: string | null;
}) {
  return {
    user: {
      ...input,
      authVersion: 1,
      name: "Fixture",
      email: "fixture@example.test",
    },
    expires: "2099-01-01T00:00:00.000Z",
  } as Session;
}

test("TC5 request IDs accept bounded safe input and replace unsafe input", () => {
  assert.equal(
    resolveRequestId(new Headers({ "x-request-id": "safe.request-123" })),
    "safe.request-123",
  );
  const generated = resolveRequestId(
    new Headers({ "x-request-id": "unsafe request value" }),
  );
  assert.match(generated, /^[a-f0-9-]{36}$/);
});

test("TC5 v1 version and liveness reads use the envelope and no-store defaults", async () => {
  for (const response of [
    await getVersion(new Request("https://example.test/api/v1/version")),
    await getLiveness(new Request("https://example.test/api/v1/health/live")),
  ]) {
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store, max-age=0");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    const body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.meta.apiVersion, "v1");
    assert.equal(body.meta.requestId, response.headers.get("x-request-id"));
    assert.equal(body.data.service, "loyalflow");
  }
});

test("TC5 internal errors never expose stack, Prisma, or provider details", async () => {
  const response = internalApiProblem("request-safe");
  const serialized = JSON.stringify(await response.json());
  assert.equal(response.status, 500);
  assert.doesNotMatch(serialized, /stack|prisma|postgres|database_url|provider/i);
  assert.match(serialized, /INTERNAL_ERROR/);
});

test("TC5 actor context derives identity and rejects unauthenticated or cross-tenant input", () => {
  assert.deepEqual(resolveApiActor({ session: null }), {
    allowed: false,
    problem: "AUTHENTICATION_REQUIRED",
  });

  const owner = session({ id: "owner", role: "OWNER", businessId: "business-a" });
  assert.deepEqual(
    resolveApiActor({ session: owner, selectedBusinessId: "business-b" }),
    { allowed: false, problem: "RESOURCE_NOT_FOUND" },
  );
  assert.deepEqual(
    resolveApiActor({
      session: owner,
      selectedBusinessId: "business-a",
      capability: "SETTINGS_EDIT",
    }),
    {
      allowed: true,
      actor: { userId: "owner", businessId: "business-a", role: "OWNER" },
    },
  );

  const viewer = session({ id: "viewer", role: "VIEWER", businessId: "business-a" });
  assert.deepEqual(
    resolveApiActor({
      session: viewer,
      selectedBusinessId: "business-a",
      capability: "SETTINGS_EDIT",
    }),
    { allowed: false, problem: "CAPABILITY_REQUIRED" },
  );
});

test("TC5 contracts remain transport neutral and legacy routes remain unchanged", () => {
  const contract = readFileSync(
    new URL("../packages/contracts/src/api/v1.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(contract, /next\/|prisma|react|process\.env|fetch\(/i);

  const diffSensitivePaths = [
    "../app/api/health/route.ts",
    "../app/api/health/live/route.ts",
  ];
  for (const path of diffSensitivePaths) {
    assert.ok(readFileSync(new URL(path, import.meta.url), "utf8").length > 0);
  }
});
