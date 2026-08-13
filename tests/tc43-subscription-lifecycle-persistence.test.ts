import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const schema = readFileSync(
  new URL("../prisma/schema.prisma", import.meta.url),
  "utf8",
);
const migration = readFileSync(
  new URL(
    "../prisma/migrations/20260813003000_add_subscription_lifecycle_persistence/migration.sql",
    import.meta.url,
  ),
  "utf8",
);
const runtime = readFileSync(
  new URL("../lib/billing/subscription-lifecycle-runtime.ts", import.meta.url),
  "utf8",
);
const actions = readFileSync(
  new URL("../app/business-owners/actions.ts", import.meta.url),
  "utf8",
);

test("TC4.3 persists the complete approved lifecycle with optimistic concurrency", () => {
  for (const state of [
    "PENDING",
    "TRIALING",
    "ACTIVE",
    "PAST_DUE",
    "SUSPENDED",
    "CANCELED",
    "EXPIRED",
  ]) {
    assert.match(schema, new RegExp(`\\b${state}\\b`));
  }
  assert.match(schema, /subscriptionLifecycleVersion\s+Int\s+@default\(0\)/);
  assert.match(runtime, /subscriptionLifecycleVersion: input\.expectedVersion/);
  assert.match(runtime, /subscriptionLifecycleVersion: \{ increment: 1 \}/);
  assert.match(runtime, /result\.count !== 1/);
});

test("TC4.3 migration truthfully backfills legacy manual billing state", () => {
  assert.match(migration, /"paymentStatus" = 'PAID'[\s\S]*'ACTIVE'/);
  assert.match(migration, /"paymentStatus" = 'DUE'[\s\S]*'ACTIVE'/);
  assert.match(migration, /"paymentStatus" = 'OVERDUE'[\s\S]*'PAST_DUE'/);
  assert.match(migration, /"paymentStatus" = 'SUSPENDED'[\s\S]*'SUSPENDED'/);
  assert.doesNotMatch(migration, /DELETE|DROP TABLE|DROP COLUMN|TRUNCATE/i);
});

test("TC4.3 mutation remains Super Admin controlled and provider neutral", () => {
  assert.match(actions, /requireSuperAdmin\(\)/);
  assert.match(actions, /subscriptionLifecycleEvents\.includes/);
  assert.doesNotMatch(runtime, /stripe|checkout|webhook|fetch\(|process\.env/i);
  assert.match(runtime, /transitionSubscriptionLifecycle/);
  assert.match(runtime, /businessActivity\.create/);
});
