import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("TC5 financial compatibility facade preserves legacy exports and overrides financial writers", () => {
  const facade = source(
    "app/businesses/[slug]/customers/[customerId]/actions.ts",
  );

  assert.match(facade, /export \* from "\.\/actions-legacy";/);
  assert.match(
    facade,
    /adjustCustomerBalanceCommandAction as adjustCustomerBalanceAction/,
  );
  assert.match(facade, /addLoyaltyCommandAction as addLoyaltyAction/);
  assert.match(facade, /redeemRewardCommandAction as redeemRewardAction/);
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
