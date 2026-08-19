import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Z11 keeps Business Owner plan visibility read-only and provider-assisted", () => {
  const settings = source("app/businesses/[slug]/settings/page.tsx");

  assert.match(settings, /getEffectivePlanLimits\(business\.plan\)/);
  assert.match(settings, /getPlanUsage\(/);
  assert.match(settings, /data-plan-usage="true"/);
  assert.match(settings, /"Current plan"/);
  assert.match(
    settings,
    /"Limits are enforced server-side\. Plan changes are managed by the platform administrator\."/,
  );
  assert.match(
    settings,
    /session\.user\.role === "SUPER_ADMIN"[\s\S]*?href="\/business-owners"/,
  );

  assert.doesNotMatch(settings, /updateBusinessPlanAction/);
  assert.doesNotMatch(settings, /updateBusinessBillingAction/);
  assert.doesNotMatch(settings, /recordBusinessPaymentAction/);
  assert.doesNotMatch(settings, /transitionBusinessSubscriptionAction/);
  assert.doesNotMatch(settings, /checkout|stripe|buy now/i);
});

test("Z11 keeps plan definitions and numeric limits under Super Admin authority", () => {
  const page = source("app/plans/page.tsx");
  const actions = source("app/plans/actions.ts");

  assert.match(page, /session\.user\.role !== "SUPER_ADMIN"/);
  assert.match(page, /getEffectivePlanLimitsMap\(\)/);
  assert.match(page, /updatePlanLimitsAction\.bind\(null, plan\)/);
  assert.match(actions, /async function requireSuperAdmin\(\)/);
  assert.match(actions, /await requireSuperAdmin\(\)/);
  assert.match(actions, /prisma\.planConfiguration\.upsert\(/);
  assert.match(actions, /revalidatePath\("\/business-owners"\)/);
});

test("Z11 keeps managed billing and subscription lifecycle operations Provider controlled", () => {
  const page = source("app/business-owners/page.tsx");
  const actions = source("app/business-owners/actions.ts");

  assert.match(page, /session\.user\.role !== "SUPER_ADMIN"/);
  assert.match(page, /recordBusinessPaymentAction/);
  assert.match(page, /transitionBusinessSubscriptionAction/);
  assert.match(page, /updateBusinessBillingAction/);
  assert.match(page, /updateBusinessPlanAction/);

  assert.match(actions, /export async function updateBusinessBillingAction/);
  assert.match(actions, /export async function recordBusinessPaymentAction/);
  assert.match(actions, /export async function updateBusinessPlanAction/);
  assert.match(actions, /export async function setBusinessPlatformStatusAction/);
  assert.match(actions, /export async function transitionBusinessSubscriptionAction/);
  assert.match(actions, /const actor = await requireSuperAdmin\(\)/);
  assert.match(actions, /const expectedVersion = Number\(formData\.get\("expectedVersion"\)\)/);
  assert.match(actions, /persistSubscriptionLifecycleTransition\(\{/);
  assert.match(actions, /actorId: actor\.id/);
  assert.match(actions, /actorEmail: actor\.email/);
});
