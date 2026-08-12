import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  canApplyPublicReferral,
  canCreatePublicMembership,
} from "@/lib/customers/public-membership-policy";
import { planCatalog } from "@/lib/entitlements";

const root = process.cwd();
const source = (file: string) => readFileSync(path.join(root, file), "utf8");

test("TC3.1 applies effective customer limits to public membership", () => {
  assert.equal(
    canCreatePublicMembership("FREE", 99, planCatalog.FREE.limits),
    true,
  );
  assert.equal(
    canCreatePublicMembership("FREE", 100, planCatalog.FREE.limits),
    false,
  );
  assert.equal(
    canCreatePublicMembership("PRO", 2, {
      ...planCatalog.PRO.limits,
      CUSTOMERS: 2,
    }),
    false,
  );
  assert.equal(
    canCreatePublicMembership("BUSINESS", 999_999, planCatalog.BUSINESS.limits),
    true,
  );
});

test("TC3.1 applies the canonical referral entitlement to public enrollment", () => {
  assert.equal(canApplyPublicReferral("FREE"), false);
  assert.equal(canApplyPublicReferral("STARTER"), false);
  assert.equal(canApplyPublicReferral("PRO"), true);
  assert.equal(canApplyPublicReferral("BUSINESS"), true);
});

test("TC3.1 Join enforces the limit inside the authoritative write transaction", () => {
  const action = source("app/join/[slug]/actions.ts");

  assert.match(action, /plan:\s*true/);
  assert.match(action, /getEffectivePlanLimits\(business\.plan\)/);
  assert.match(action, /transaction\.customer\.count/);
  assert.match(action, /canCreatePublicMembership/);
  assert.match(action, /isolationLevel:\s*"Serializable"/);
  assert.match(action, /customerLimitReached/);
});

test("TC3.1 referral feedback and writes require entitlement and a live tenant code", () => {
  const action = source("app/join/[slug]/actions.ts");
  const joinPage = source("app/join/[slug]/page.tsx");
  const publicCard = source("app/card/[token]/page.tsx");

  assert.match(action, /canApplyPublicReferral\(business\.plan\)/);
  assert.match(joinPage, /canApplyPublicReferral\(business\.plan\)/);
  assert.match(joinPage, /businessId:\s*business\.id/);
  assert.match(joinPage, /customer:\s*\{ isActive:\s*true \}/);
  assert.match(joinPage, /appliedReferralCode/);
  assert.match(publicCard, /canApplyPublicReferral\(business\.plan\)/);
});
