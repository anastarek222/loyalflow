import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("TC5 financial compatibility facade exports async wrappers and overrides financial writers", () => {
  const facade = source(
    "app/businesses/[slug]/customers/[customerId]/actions.ts",
  );

  assert.doesNotMatch(facade, /export \*|export \{/);
  for (const name of [
    "updateCustomerAction",
    "setCustomerStatusAction",
    "adjustCustomerBalanceAction",
    "createCustomerReferralCodeAction",
    "createAndAssignCustomerTagAction",
    "assignCustomerTagAction",
    "removeCustomerTagAction",
    "createCustomerNoteAction",
    "updateCustomerNoteAction",
    "addLoyaltyAction",
    "redeemRewardAction",
  ]) {
    assert.match(facade, new RegExp(`export async function ${name}`));
  }

  assert.match(facade, /return adjustCustomerBalanceCommandAction\(slug, customerId, formData\)/);
  assert.match(facade, /return addLoyaltyCommandAction\(slug, customerId, formData\)/);
  assert.match(facade, /return redeemRewardCommandAction\(slug, customerId, rewardId, formData\)/);
});

test("TC5 non-financial compatibility wrappers retain the legacy implementation", () => {
  const facade = source(
    "app/businesses/[slug]/customers/[customerId]/actions.ts",
  );

  assert.match(facade, /return legacy\.updateCustomerAction/);
  assert.match(facade, /return legacy\.setCustomerStatusAction/);
  assert.match(facade, /return legacy\.createCustomerReferralCodeAction/);
  assert.match(facade, /return legacy\.createAndAssignCustomerTagAction/);
  assert.match(facade, /return legacy\.assignCustomerTagAction/);
  assert.match(facade, /return legacy\.removeCustomerTagAction/);
  assert.match(facade, /return legacy\.createCustomerNoteAction/);
  assert.match(facade, /return legacy\.updateCustomerNoteAction/);
});

test("TC5 customer and scan surfaces continue through the compatibility facade", () => {
  const customerPage = source(
    "app/businesses/[slug]/customers/[customerId]/page.tsx",
  );
  const scanPage = source(
    "app/businesses/[slug]/scan/customer/[customerId]/page.tsx",
  );

  assert.match(customerPage, /from "\.\/actions";/);
  assert.match(
    scanPage,
    /from "@\/app\/businesses\/\[slug\]\/customers\/\[customerId\]\/actions";/,
  );
});

test("TC5 legacy implementation is retained only as the compatibility fallback", () => {
  const legacy = source(
    "app/businesses/[slug]/customers/[customerId]/actions-legacy.ts",
  );

  assert.match(legacy, /export async function adjustCustomerBalanceAction/);
  assert.match(legacy, /export async function addLoyaltyAction/);
  assert.match(legacy, /export async function redeemRewardAction/);
});
