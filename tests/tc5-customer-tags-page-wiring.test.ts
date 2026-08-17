import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");

const page = source("app/businesses/[slug]/customers/[customerId]/page.tsx");

test("TC5 Customer Tags active page uses the command-backed actions", () => {
  assert.match(page, /from "\.\/tag-actions"/);
  assert.match(
    page,
    /createAndAssignCustomerTagCommandAction\.bind\([\s\S]{0,100}business\.slug,[\s\S]{0,80}customer\.id/,
  );
  assert.match(page, /assignCustomerTagCommandAction\.bind/);
  assert.match(page, /removeCustomerTagCommandAction\.bind/);
  assert.doesNotMatch(page, /\bcreateAndAssignCustomerTagAction\b/);
  assert.doesNotMatch(page, /\bassignCustomerTagAction\b/);
  assert.doesNotMatch(page, /\bremoveCustomerTagAction\b/);
});

test("TC5 Customer Tags wiring does not migrate referral or note writers", () => {
  assert.match(page, /createCustomerReferralCodeAction\.bind/);
  assert.match(page, /createCustomerNoteAction\.bind/);
  assert.match(page, /updateCustomerNoteAction\.bind/);
});
