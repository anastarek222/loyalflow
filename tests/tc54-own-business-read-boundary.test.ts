import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("TC5.4 centralizes protected own-business read handling", async () => {
  const [boundary, summary, access] = await Promise.all([
    readFile("lib/api/v1/own-business-read.ts", "utf8"),
    readFile("app/api/v1/business/summary/route.ts", "utf8"),
    readFile("app/api/v1/business/access/route.ts", "utf8"),
  ]);

  for (const route of [summary, access]) {
    assert.match(route, /resolveOwnBusinessRead\(request, "CUSTOMERS_VIEW"\)/);
    assert.doesNotMatch(route, /AUTHENTICATION_REQUIRED|CAPABILITY_REQUIRED/);
    assert.doesNotMatch(route, /searchParams|tenantId|slug/);
  }

  assert.match(boundary, /getOwnBusinessApiActor\(capability\)/);
  assert.match(boundary, /status: 401/);
  assert.match(boundary, /status: 403/);
  assert.match(boundary, /status: 404/);
  assert.doesNotMatch(
    boundary,
    /prisma|create\(|update\(|delete\(|upsert\(|\$transaction|fetch\(/,
  );
});
