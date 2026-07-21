import assert from "node:assert/strict";
import test from "node:test";

import {
  findDuplicateCustomerGroups,
  getReadOnlyMergePreview,
} from "../lib/customers/duplicates";
import { canPerform } from "../lib/permissions";

const createdAt = new Date("2026-01-01T00:00:00.000Z");

function customer(overrides: Partial<{
  id: string;
  businessId: string;
  phone: string;
  customerCode: string;
  email: string | null;
  createdAt: Date;
}> = {}) {
  return {
    id: "customer-1",
    businessId: "business-a",
    firstName: "Customer",
    lastName: null,
    phone: "+201000000001",
    customerCode: "CUS-001",
    email: null,
    createdAt,
    ...overrides,
  };
}

test("detects same-phone candidates after safe normalization", () => {
  const groups = findDuplicateCustomerGroups([
    customer({ id: "one", phone: "+20 100-000-0001" }),
    customer({ id: "two", phone: "201000000001", customerCode: "CUS-002" }),
  ]);

  assert.deepEqual(groups.map((group) => group.reason), ["NORMALIZED_PHONE"]);
  assert.deepEqual(groups[0]?.customers.map((item) => item.id), ["one", "two"]);
});

test("supports normalized email matching only when a persisted email is available", () => {
  const groups = findDuplicateCustomerGroups([
    customer({ id: "one", email: "VIP@Example.test" }),
    customer({ id: "two", phone: "+201000000002", customerCode: "CUS-002", email: " vip@example.test " }),
  ]);

  assert.deepEqual(groups.map((group) => group.reason), ["NORMALIZED_EMAIL"]);
});

test("avoids false positives for different values and isolates businesses", () => {
  const groups = findDuplicateCustomerGroups([
    customer({ id: "one", phone: "+201000000001" }),
    customer({ id: "two", phone: "+201000000002", customerCode: "CUS-002" }),
    customer({ id: "other-tenant", businessId: "business-b", customerCode: "CUS-003" }),
  ]);

  assert.equal(groups.length, 0);
});

test("read-only merge preview selects the oldest candidate but cannot execute", () => {
  const groups = findDuplicateCustomerGroups([
    customer({ id: "newer", createdAt: new Date("2026-02-01T00:00:00.000Z") }),
    customer({ id: "older", customerCode: "CUS-002" }),
  ]);
  const preview = getReadOnlyMergePreview(groups[0]!);

  assert.equal(preview.survivor.id, "older");
  assert.equal(preview.sourceCustomers[0]?.id, "newer");
  assert.equal(preview.executable, false);
  assert.equal(preview.preservationRequirements.length, 3);
});

test("duplicate review is restricted to tenant customer editors", () => {
  assert.equal(canPerform({ role: "OWNER", businessId: "business-a" }, "business-a", "CUSTOMERS_EDIT"), true);
  assert.equal(canPerform({ role: "MANAGER", businessId: "business-a" }, "business-a", "CUSTOMERS_EDIT"), true);
  assert.equal(canPerform({ role: "VIEWER", businessId: "business-a" }, "business-a", "CUSTOMERS_EDIT"), false);
  assert.equal(canPerform({ role: "OWNER", businessId: "business-a" }, "business-b", "CUSTOMERS_EDIT"), false);
});
