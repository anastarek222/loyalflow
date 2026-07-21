import assert from "node:assert/strict";
import test from "node:test";

import {
  customerNoteContentSchema,
  customerTagNameSchema,
  getCustomerTagWhere,
  getPublicCustomerCardForbiddenRelations,
} from "../lib/customers/notes-tags";
import { canPerform } from "../lib/permissions";

test("normalizes reusable tag names and rejects empty values", () => {
  assert.equal(customerTagNameSchema.parse("  Premium   Customer  "), "Premium Customer");
  assert.equal(customerTagNameSchema.safeParse("   ").success, false);
});

test("private notes require meaningful bounded content", () => {
  assert.equal(customerNoteContentSchema.parse("  Prefer afternoon calls. "), "Prefer afternoon calls.");
  assert.equal(customerNoteContentSchema.safeParse("").success, false);
  assert.equal(customerNoteContentSchema.safeParse("x".repeat(2_001)).success, false);
});

test("tag filtering uses the normalized assignment relation", () => {
  assert.deepEqual(getCustomerTagWhere(null), {});
  assert.deepEqual(getCustomerTagWhere("tag-vip"), {
    tagAssignments: { some: { tagId: "tag-vip" } },
  });
});

test("only customer editors can change private notes and tags", () => {
  const businessId = "business-a";
  assert.equal(canPerform({ role: "OWNER", businessId }, businessId, "CUSTOMERS_EDIT"), true);
  assert.equal(canPerform({ role: "MANAGER", businessId }, businessId, "CUSTOMERS_EDIT"), true);
  assert.equal(canPerform({ role: "STAFF", businessId }, businessId, "CUSTOMERS_EDIT"), false);
  assert.equal(canPerform({ role: "VIEWER", businessId }, businessId, "CUSTOMERS_EDIT"), false);
  assert.equal(canPerform({ role: "OWNER", businessId }, "business-b", "CUSTOMERS_EDIT"), false);
});

test("public card projections explicitly exclude private notes and tags", () => {
  assert.deepEqual(getPublicCustomerCardForbiddenRelations(), ["notes", "tagAssignments"]);
});
