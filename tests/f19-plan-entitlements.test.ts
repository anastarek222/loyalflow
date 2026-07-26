import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  getPlanEntitlements,
  getPlanLimit,
  getPlanUsage,
  hasFeatureEntitlement,
  isWithinPlanLimit,
  planCatalog,
} from "@/lib/entitlements";

const root = process.cwd();
function source(file: string) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

test("F19.3 defines four deterministic plans with progressively broader capabilities", () => {
  assert.deepEqual(Object.keys(planCatalog), ["FREE", "STARTER", "PRO", "BUSINESS"]);
  assert.equal(hasFeatureEntitlement("FREE", "REPORTING"), false);
  assert.equal(hasFeatureEntitlement("STARTER", "REPORTING"), true);
  assert.equal(hasFeatureEntitlement("PRO", "MULTI_BRANCH"), true);
  assert.equal(hasFeatureEntitlement("BUSINESS", "GOOGLE_WALLET_READINESS"), true);
  assert.ok(getPlanEntitlements("BUSINESS").length > getPlanEntitlements("PRO").length);
});

test("F19.3 applies explicit customer, user, branch, offer and reward limits", () => {
  assert.equal(getPlanLimit("FREE", "CUSTOMERS"), 100);
  assert.equal(getPlanLimit("FREE", "USERS"), 2);
  assert.equal(getPlanLimit("STARTER", "CUSTOMERS"), 500);
  assert.equal(getPlanLimit("PRO", "BRANCHES"), 5);
  assert.equal(getPlanLimit("BUSINESS", "REWARDS"), null);
});

test("F19.3 blocks the next write at a reached limit without deleting existing data", () => {
  assert.equal(isWithinPlanLimit("FREE", "CUSTOMERS", 99), true);
  assert.equal(isWithinPlanLimit("FREE", "CUSTOMERS", 100), false);
  assert.equal(isWithinPlanLimit("PRO", "USERS", 15), false);
  assert.equal(isWithinPlanLimit("BUSINESS", "USERS", 999999), true);
});

test("F19.3 exposes deterministic owner-facing usage including unlimited limits", () => {
  const usage = getPlanUsage("BUSINESS", {
    CUSTOMERS: 1200,
    USERS: 30,
    BRANCHES: 12,
    OFFERS: 50,
    REWARDS: 20,
  });

  assert.equal(usage.every((item) => item.limit === null), true);
  assert.equal(usage.every((item) => item.reached === false), true);
});

test("F19.3 migration preserves existing tenants on Business while new schema default is Free", () => {
  const schema = source("prisma/schema.prisma");
  const migration = source(
    "prisma/migrations/20260726224500_add_subscription_plan_entitlements/migration.sql",
  );

  assert.match(schema, /plan\s+SubscriptionPlan @default\(FREE\)/);
  assert.match(migration, /DEFAULT 'BUSINESS'/);
  assert.match(migration, /UPDATE "Business" SET "plan" = 'BUSINESS'/);
  assert.match(migration, /ALTER COLUMN "plan" SET DEFAULT 'FREE'/);
});

test("F19.3 new-business onboarding and Super Admin operations can assign a plan", () => {
  const creation = source("app/businesses/actions.ts");
  const wizard = source("components/business-setup-wizard.tsx");
  const adminActions = source("app/business-owners/actions.ts");
  const adminPage = source("app/business-owners/page.tsx");

  assert.match(creation, /plan: parsed\.data\.plan/);
  assert.match(wizard, /name="plan"/);
  assert.match(adminActions, /updateBusinessPlanAction/);
  assert.match(adminActions, /session\.user\.role !== "SUPER_ADMIN"/);
  assert.match(adminPage, /Update plan/);
});

test("F19.3 server mutations enforce plan limits on the authoritative write paths", () => {
  for (const file of [
    "app/businesses/[slug]/customers/actions.ts",
    "app/businesses/[slug]/users/actions.ts",
    "app/businesses/[slug]/branches/actions.ts",
    "app/businesses/[slug]/offers/actions.ts",
    "app/businesses/[slug]/rewards/actions.ts",
  ]) {
    assert.match(source(file), /isWithinPlanLimit/);
  }

  assert.match(source("app/businesses/[slug]/offers/actions.ts"), /hasFeatureEntitlement/);
  assert.match(source("app/businesses/[slug]/rewards/actions.ts"), /hasFeatureEntitlement/);
});

test("F19.3 navigation and direct premium routes both respect plan entitlements", () => {
  assert.match(source("lib/app-shell-navigation.ts"), /hasFeatureEntitlement/);
  assert.match(source("app/businesses/[slug]/campaigns/page.tsx"), /"CAMPAIGNS"/);
  assert.match(source("app/businesses/[slug]/recovery/page.tsx"), /"CAMPAIGNS"/);
  assert.match(source("app/businesses/[slug]/reports/page.tsx"), /"REPORTING"/);
  assert.match(source("app/businesses/[slug]/reports/export/route.ts"), /"REPORTING"/);
  assert.match(source("app/businesses/[slug]/recovery/export/route.ts"), /"CAMPAIGNS"/);
});


test("F19.3 plan limits are centrally editable by Super Admin", () => {
  const schema = source("prisma/schema.prisma");
  const migration = source(
    "prisma/migrations/20260726224500_add_subscription_plan_entitlements/migration.sql",
  );
  const page = source("app/plans/page.tsx");
  const actions = source("app/plans/actions.ts");

  assert.match(schema, /model PlanConfiguration/);
  assert.match(schema, /customerLimit\s+Int\?/);
  assert.match(schema, /rewardLimit\s+Int\?/);
  assert.match(migration, /CREATE TABLE "PlanConfiguration"/);
  assert.match(page, /Plans & limits/);
  assert.match(page, /name=\{inputName\(field\.key\)\}/);
  assert.match(actions, /updatePlanLimitsAction/);
  assert.match(actions, /session\.user\.role !== "SUPER_ADMIN"/);
});

test("F19.3 authoritative limits read editable database configuration", () => {
  const server = source("lib/entitlements-server.ts");
  assert.match(server, /prisma\.planConfiguration\.findUnique/);
  assert.match(server, /configurationToPlanLimits/);

  for (const file of [
    "app/businesses/[slug]/customers/actions.ts",
    "app/businesses/[slug]/users/actions.ts",
    "app/businesses/[slug]/branches/actions.ts",
    "app/businesses/[slug]/offers/actions.ts",
    "app/businesses/[slug]/rewards/actions.ts",
  ]) {
    assert.match(source(file), /getEffectivePlanLimits/);
  }
});

test("F19.3 blank editable limits mean unlimited and reductions do not delete data", () => {
  const actions = source("app/plans/actions.ts");
  const migration = source(
    "prisma/migrations/20260726224500_add_subscription_plan_entitlements/migration.sql",
  );

  assert.match(actions, /text === "" \? null : text/);
  assert.match(actions, /z\.coerce\.number\(\)\.int\(\)\.min\(0\)/);
  assert.doesNotMatch(actions, /deleteMany|delete\(/);
  assert.match(migration, /'plan-business'[\s\S]*NULL, NULL, NULL, NULL, NULL/);
});
