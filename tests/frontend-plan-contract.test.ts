import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath: string) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("frontend plan stays scoped to frontend execution", () => {
  const plan = source("docs/FRONTEND_PLAN.md");

  assert.match(plan, /frontend only/i);
  assert.match(plan, /marketing/i);
  assert.match(plan, /authentication/i);
  assert.match(plan, /SaaS UI/i);
  assert.match(plan, /customer-facing/i);
  assert.match(plan, /visual-regression/i);
  assert.doesNotMatch(plan, /Meta API|WABA|webhook|outbox|subscription entitlement/i);
});
