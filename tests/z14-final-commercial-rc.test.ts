import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Z14 keeps the final RC Provider-assisted instead of inventing self-service commerce", () => {
  const zPlan = source("docs/FINAL_PRODUCT_Z_PLAN.md");
  const rc = source("docs/Z14_FINAL_COMMERCIAL_RC.md");
  const settings = source("app/businesses/[slug]/settings/page.tsx");
  const marketing = source("app/page.tsx");

  assert.match(zPlan, /Current Final Product V1 is Provider-assisted, not self-service billing commerce\./);
  assert.match(zPlan, /specific commercial plan names, prices, and final capability matrix are not invented/i);
  assert.match(rc, /Status: `SOURCE_RC_READY_RELEASE_GATES_PENDING`/);
  assert.match(rc, /Final Product V1 remains Provider-assisted, not self-service billing commerce\./);
  assert.match(settings, /Plan changes are managed by the platform administrator\./);
  assert.doesNotMatch(settings, /checkout|stripe|buy now/i);
  assert.doesNotMatch(marketing, /checkout|stripe|buy now|pricing|price/i);
});

test("Z14 preserves Provider authority for managed plan and subscription operations", () => {
  const plans = source("app/plans/page.tsx");
  const owners = source("app/business-owners/page.tsx");
  const ownerActions = source("app/business-owners/actions.ts");

  assert.match(plans, /session\.user\.role !== "SUPER_ADMIN"/);
  assert.match(owners, /session\.user\.role !== "SUPER_ADMIN"/);
  assert.match(owners, /updateBusinessPlanAction/);
  assert.match(owners, /recordBusinessPaymentAction/);
  assert.match(owners, /transitionBusinessSubscriptionAction/);
  assert.match(ownerActions, /const actor = await requireSuperAdmin\(\)/);
});

test("Z14 reaches release gates without falsely closing real-business, payment, or Production gates", () => {
  const rc = source("docs/Z14_FINAL_COMMERCIAL_RC.md");
  const deferred = source("docs/BETA_DEFERRED_REGISTER.md");
  const readiness = source("docs/PRODUCTION_READINESS_AUDIT.md");
  const zPlan = source("docs/FINAL_PRODUCT_Z_PLAN.md");

  assert.match(rc, /READY_FOR_RELEASE_GATES/);
  assert.match(rc, /not `READY_FOR_PRODUCTION`, `GA_READY`, or permission to deploy Production/);
  assert.match(deferred, /self-service signup, tenant\/trial bootstrap, legal-consent lifecycle, pricing, analytics, billing\/payment/);
  assert.match(deferred, /`DEFERRED_REAL_CLOSED_BETA`/);
  assert.match(deferred, /Production status: forbidden until an explicit later authorization/);
  assert.match(readiness, /This document is a readiness assessment, not a\s+deployment authorization\./);
  assert.match(zPlan, /`READY_FOR_RELEASE_GATES` is reached after Z14\./);
});
