import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");

const page = source("app/businesses/[slug]/customers/[customerId]/page.tsx");
const referralAction = source(
  "app/businesses/[slug]/customers/[customerId]/referral-actions.ts",
);

test("TC5 Customer Referral command action is available for integrated compatibility adoption", () => {
  assert.match(
    referralAction,
    /export async function createCustomerReferralCodeCommandAction/,
  );
  assert.match(referralAction, /createCustomerReferralCodeCommand/);
  assert.match(page, /\bcreateCustomerReferralCodeAction\b/);
});

test("TC5 Referral integration preserves already-merged Notes command wiring", () => {
  assert.match(page, /createCustomerNoteCommandAction\.bind/);
  assert.match(page, /updateCustomerNoteCommandAction\.bind/);
});
