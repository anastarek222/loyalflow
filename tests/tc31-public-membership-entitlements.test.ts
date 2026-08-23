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

test("TC3.1 command enforces effective limits inside the authoritative write transaction", () => {
  const command = source("lib/server/business/public-membership-command.ts");
  const action = source("app/join/[slug]/actions.ts");

  assert.match(command, /transaction\.planConfiguration\.findUnique/);
  assert.match(command, /configurationToPlanLimits\(configuration, business\.plan\)/);
  assert.match(command, /transaction\.customer\.count/);
  assert.match(command, /canCreatePublicMembership\(business\.plan, customerCount, planLimits\)/);
  assert.match(command, /reason:\s*"PLAN_LIMIT"/);
  assert.match(command, /transaction\.customer\.create/);
  assert.match(command, /isolationLevel:\s*"Serializable"/);

  assert.match(action, /createPublicMembershipCommand/);
  assert.match(action, /result\.reason === "PLAN_LIMIT"/);
  assert.match(action, /customerLimitReached/);
});

test("TC3.1 command referral writes require entitlement and a live same-tenant code", () => {
  const command = source("lib/server/business/public-membership-command.ts");
  const joinPage = source("app/join/[slug]/page.tsx");
  const publicCard = source("app/card/[token]/page.tsx");

  assert.match(command, /canApplyPublicReferral\(business\.plan\)/);
  assert.match(command, /businessId:\s*input\.businessId/);
  assert.match(command, /code:\s*input\.referralCode/);
  assert.match(command, /isActive:\s*true/);
  assert.match(command, /customer:\s*\{ isActive:\s*true \}/);
  assert.match(command, /canRecordReferral\(/);
  assert.match(command, /referrerBusinessId:\s*referrerCode\.businessId/);
  assert.match(command, /referrerIsActive:\s*referrerCode\.customer\.isActive/);
  assert.match(command, /transaction\.referral\.create/);

  assert.match(joinPage, /canApplyPublicReferral\(business\.plan\)/);
  assert.match(joinPage, /businessId:\s*business\.id/);
  assert.match(joinPage, /customer:\s*\{ isActive:\s*true \}/);
  assert.match(joinPage, /appliedReferralCode/);
  assert.match(publicCard, /canApplyPublicReferral\(business\.plan\)/);
});
