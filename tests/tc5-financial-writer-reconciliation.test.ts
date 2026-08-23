import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("TC5 compatibility facade exports async wrappers and routes migrated writers to commands", () => {
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

  assert.match(facade, /return updateCustomerRecordCommandAction\(slug, customerId, formData\)/);
  assert.match(facade, /return setCustomerRecordStatusCommandAction\(slug, customerId, isActive\)/);
  assert.match(facade, /return adjustCustomerBalanceCommandAction\(slug, customerId, formData\)/);
  assert.match(facade, /return addLoyaltyCommandAction\(slug, customerId, formData\)/);
  assert.match(facade, /return redeemRewardCommandAction\(slug, customerId, rewardId, formData\)/);
  assert.match(facade, /return createCustomerReferralCodeCommandAction\(slug, customerId\)/);
  assert.match(facade, /return createAndAssignCustomerTagCommandAction\(slug, customerId, formData\)/);
  assert.match(facade, /return assignCustomerTagCommandAction\(slug, customerId, tagId\)/);
  assert.match(facade, /return removeCustomerTagCommandAction\(slug, customerId, tagId\)/);
  assert.match(facade, /return createCustomerNoteCommandAction\(slug, customerId, formData\)/);
  assert.match(facade, /return updateCustomerNoteCommandAction\(slug, customerId, noteId, formData\)/);
});

test("TC5 compatibility facade has no remaining legacy Customer Detail fallback", () => {
  const facade = source(
    "app/businesses/[slug]/customers/[customerId]/actions.ts",
  );

  assert.doesNotMatch(facade, /actions-legacy|legacy\./);
  assert.equal(
    existsSync(
      join(root, "app/businesses/[slug]/customers/[customerId]/actions-legacy.ts"),
    ),
    false,
  );
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
