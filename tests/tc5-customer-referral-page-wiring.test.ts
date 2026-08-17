import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");

const page = source("app/businesses/[slug]/customers/[customerId]/page.tsx");

test("TC5 Customer Referral active page uses the command-backed action", () => {
  assert.match(page, /from "\.\/referral-actions"/);
  assert.match(
    page,
    /createCustomerReferralCodeCommandAction\.bind\([\s\S]{0,100}business\.slug,[\s\S]{0,80}customer\.id/,
  );
  assert.doesNotMatch(page, /\bcreateCustomerReferralCodeAction\b/);
});

test("TC5 Customer Referral wiring does not migrate notes or tag writers", () => {
  assert.match(page, /createCustomerNoteAction\.bind/);
  assert.match(page, /updateCustomerNoteAction\.bind/);
  assert.match(page, /createAndAssignCustomerTagAction\.bind/);
  assert.match(page, /assignCustomerTagAction\.bind/);
  assert.match(page, /removeCustomerTagAction\.bind/);
});
