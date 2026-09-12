import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { canPerform } from "../lib/permissions";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

const businessId = "business-1";
const otherBusinessId = "business-2";

test("STAFF_MANAGE is owner-only inside the tenant, with super-admin override", () => {
  assert.equal(canPerform({ role: "OWNER", businessId }, businessId, "STAFF_MANAGE"), true);
  assert.equal(canPerform({ role: "MANAGER", businessId }, businessId, "STAFF_MANAGE"), false);
  assert.equal(canPerform({ role: "STAFF", businessId }, businessId, "STAFF_MANAGE"), false);
  assert.equal(canPerform({ role: "VIEWER", businessId }, businessId, "STAFF_MANAGE"), false);
  assert.equal(canPerform({ role: "OWNER", businessId: otherBusinessId }, businessId, "STAFF_MANAGE"), false);
  assert.equal(canPerform({ role: "SUPER_ADMIN", businessId: null }, businessId, "STAFF_MANAGE"), true);
});

test("team server actions authorize through STAFF_MANAGE and tenant-scope target users", () => {
  const actions = source("app/businesses/[slug]/users/actions.ts");

  assert.match(actions, /canPerform\(session\.user, business\.id, "STAFF_MANAGE"\)/);
  assert.match(actions, /where:\s*\{\s*id:\s*userId,\s*businessId,/s);
  assert.match(actions, /targetUser\.role === "OWNER"/);
  assert.match(actions, /targetUser\.id ===\s*session\.user\.id/s);
});
