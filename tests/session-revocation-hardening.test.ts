import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function between(input: string, start: string, end: string) {
  const startIndex = input.indexOf(start);
  const endIndex = input.indexOf(end, startIndex + start.length);

  assert.notEqual(startIndex, -1, `missing start marker: ${start}`);
  assert.notEqual(endIndex, -1, `missing end marker: ${end}`);

  return input.slice(startIndex, endIndex);
}

test("user deactivation rotates authVersion only when crossing active to inactive", () => {
  const actions = source("app/businesses/[slug]/users/actions.ts");
  const statusAction = between(
    actions,
    "export async function setBusinessUserStatusAction(",
    "export async function resetBusinessUserPasswordAction(",
  );

  assert.match(
    statusAction,
    /const shouldRevokeSessions = targetUser\.isActive && !parsedStatus\.data;/,
  );
  assert.match(
    statusAction,
    /\.\.\.\(shouldRevokeSessions[\s\S]*?authVersion:\s*\{\s*increment:\s*1,?\s*\}/,
  );
  assert.match(statusAction, /isActive:\s*parsedStatus\.data/);
});

test("Owner deactivation uses the same revocation path as other business users", () => {
  const actions = source("app/businesses/[slug]/users/actions.ts");
  const statusAction = between(
    actions,
    "export async function setBusinessUserStatusAction(",
    "export async function resetBusinessUserPasswordAction(",
  );

  assert.match(statusAction, /targetUser\.role === "OWNER"/);
  assert.match(
    statusAction,
    /const shouldRevokeSessions = targetUser\.isActive && !parsedStatus\.data;/,
  );
  assert.match(statusAction, /authVersion:\s*\{\s*increment:\s*1/);
});

test("business suspension rotates every tenant authVersion in the same transaction", () => {
  const actions = source("app/business-owners/actions.ts");
  const statusAction = between(
    actions,
    "export async function setBusinessPlatformStatusAction(",
    "export async function transitionBusinessSubscriptionAction(",
  );

  assert.match(statusAction, /select:\s*\{\s*id:\s*true,\s*isActive:\s*true\s*\}/);
  assert.match(
    statusAction,
    /const shouldRevokeTenantSessions = business\.isActive && !isActive;/,
  );
  assert.match(statusAction, /prisma\.\$transaction\(async \(transaction\) =>/);
  assert.match(
    statusAction,
    /if \(shouldRevokeTenantSessions\)[\s\S]*?transaction\.user\.updateMany\(\{[\s\S]*?where:\s*\{\s*businessId:\s*business\.id\s*\}[\s\S]*?authVersion:\s*\{\s*increment:\s*1,?\s*\}/,
  );
});

test("reactivation and no-op status updates do not rotate authVersion", () => {
  const userActions = source("app/businesses/[slug]/users/actions.ts");
  const businessActions = source("app/business-owners/actions.ts");

  const userStatusAction = between(
    userActions,
    "export async function setBusinessUserStatusAction(",
    "export async function resetBusinessUserPasswordAction(",
  );
  const businessStatusAction = between(
    businessActions,
    "export async function setBusinessPlatformStatusAction(",
    "export async function transitionBusinessSubscriptionAction(",
  );

  assert.match(
    userStatusAction,
    /targetUser\.isActive && !parsedStatus\.data/,
  );
  assert.match(
    businessStatusAction,
    /business\.isActive && !isActive/,
  );
  assert.doesNotMatch(userStatusAction, /!targetUser\.isActive && parsedStatus\.data/);
  assert.doesNotMatch(businessStatusAction, /!business\.isActive && isActive/);
});

test("JWT validation rejects stale authVersion after access returns", () => {
  const auth = source("auth.ts");

  assert.match(auth, /if \(!currentUser\.isActive\)\s*\{\s*return null;/);
  assert.match(
    auth,
    /if \(currentUser\.business && !currentUser\.business\.isActive\)\s*\{\s*return null;/,
  );
  assert.match(
    auth,
    /!isCurrentAuthVersion\(\s*token\.authVersion,\s*currentUser\.authVersion,?\s*\)/,
  );
});
