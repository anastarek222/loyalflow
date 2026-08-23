import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

import {
  apiV1SafeWriteDefaults,
  evaluateApiV1WriteBoundary,
} from "@/lib/api/v1/write-policy";

const root = process.cwd();
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("TC5 safe-write defaults preserve current Server Action compatibility transport", () => {
  assert.equal(apiV1SafeWriteDefaults.transport, "SERVER_ACTION");
  assert.equal(apiV1SafeWriteDefaults.actorSource, "SERVER_SESSION");
  assert.equal(apiV1SafeWriteDefaults.tenantSource, "SERVER_SESSION");
  assert.equal(apiV1SafeWriteDefaults.transactionPolicy, "AUTHORITATIVE_TRANSACTION");
});

test("TC5 write boundary rejects client-derived actor or tenant authority", () => {
  const actor = evaluateApiV1WriteBoundary({
    ...apiV1SafeWriteDefaults,
    actorSource: "CLIENT_SUPPLIED",
  });
  const tenant = evaluateApiV1WriteBoundary({
    ...apiV1SafeWriteDefaults,
    tenantSource: "CLIENT_SUPPLIED",
  });

  assert.equal(actor.allowed, false);
  assert.deepEqual(actor.reasons, ["actor-must-be-server-derived"]);
  assert.equal(tenant.allowed, false);
  assert.deepEqual(tenant.reasons, ["tenant-must-be-server-derived"]);
});

test("TC5 Route Handler writes fail closed without explicit same-origin CSRF evidence", () => {
  const blocked = evaluateApiV1WriteBoundary({
    ...apiV1SafeWriteDefaults,
    transport: "ROUTE_HANDLER",
    sameOriginCsrfGuard: false,
  });
  const allowed = evaluateApiV1WriteBoundary({
    ...apiV1SafeWriteDefaults,
    transport: "ROUTE_HANDLER",
    sameOriginCsrfGuard: true,
  });

  assert.equal(blocked.allowed, false);
  assert.deepEqual(blocked.reasons, [
    "route-handler-write-requires-same-origin-csrf-guard",
  ]);
  assert.equal(allowed.allowed, true);
});

test("TC5 remains write-route free until a bounded consumer proves the policy", () => {
  const apiV1Tree = source("docs/TC5_SAFE_WRITE_BOUNDARY.md");
  assert.match(apiV1Tree, /No new write Route Handler is introduced/);
  assert.match(apiV1Tree, /Business Settings/);
});
