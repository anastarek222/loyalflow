import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path: string) =>
  readFileSync(join(process.cwd(), path), "utf8");

const page = source("app/businesses/[slug]/customers/[customerId]/page.tsx");
const tagActions = source(
  "app/businesses/[slug]/customers/[customerId]/tag-actions.ts",
);

test("TC5 Customer Tag command actions are available for integrated compatibility adoption", () => {
  assert.match(tagActions, /export async function createAndAssignCustomerTagCommandAction/);
  assert.match(tagActions, /export async function assignCustomerTagCommandAction/);
  assert.match(tagActions, /export async function removeCustomerTagCommandAction/);
  assert.match(tagActions, /createAndAssignCustomerTagCommand/);
  assert.match(tagActions, /assignCustomerTagCommand/);
  assert.match(tagActions, /removeCustomerTagCommand/);
  assert.match(page, /\bcreateAndAssignCustomerTagAction\b/);
  assert.match(page, /\bassignCustomerTagAction\b/);
  assert.match(page, /\bremoveCustomerTagAction\b/);
});

test("TC5 Tag integration preserves already-merged Notes command wiring", () => {
  assert.match(page, /createCustomerNoteCommandAction\.bind/);
  assert.match(page, /updateCustomerNoteCommandAction\.bind/);
});
