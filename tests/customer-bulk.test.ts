import assert from "node:assert/strict";
import test from "node:test";

import {
  getBulkStateChangeIds,
  parseSelectedCustomerIds,
  parseSelectedExportIds,
  requiresBulkConfirmation,
} from "../lib/customers/bulk";
import { canPerform } from "../lib/permissions";

test("accepts a bounded selected-only customer set and rejects invalid or duplicate ids", () => {
  assert.deepEqual(parseSelectedCustomerIds(JSON.stringify(["customer-001", "customer-002"])), ["customer-001", "customer-002"]);
  assert.equal(parseSelectedCustomerIds(JSON.stringify(["customer-001", "customer-001"])), null);
  assert.equal(parseSelectedCustomerIds(JSON.stringify([])), null);
  assert.equal(parseSelectedCustomerIds("not-json"), null);
  assert.deepEqual(parseSelectedExportIds("customer-001,customer-002"), ["customer-001", "customer-002"]);
});

test("bulk state changes reject cross-tenant or partial selections before mutation", () => {
  const selected = ["customer-001", "customer-002"];
  assert.deepEqual(
    getBulkStateChangeIds([
      { id: "customer-001", businessId: "business-a", isActive: false },
      { id: "customer-002", businessId: "business-a", isActive: true },
    ], "business-a", selected, true),
    ["customer-001"]
  );
  assert.equal(
    getBulkStateChangeIds([{ id: "customer-001", businessId: "business-a", isActive: false }], "business-a", selected, true),
    null
  );
  assert.equal(
    getBulkStateChangeIds([
      { id: "customer-001", businessId: "business-a", isActive: false },
      { id: "customer-002", businessId: "business-b", isActive: false },
    ], "business-a", selected, true),
    null
  );
});

test("only destructive bulk operations require explicit confirmation", () => {
  assert.equal(requiresBulkConfirmation("DEACTIVATE"), true);
  assert.equal(requiresBulkConfirmation("REMOVE_TAG"), true);
  assert.equal(requiresBulkConfirmation("ACTIVATE"), false);
  assert.equal(requiresBulkConfirmation("ADD_TAG"), false);
});

test("bulk mutations remain unavailable to viewers, staff, and cross-tenant users", () => {
  assert.equal(canPerform({ role: "OWNER", businessId: "business-a" }, "business-a", "CUSTOMERS_EDIT"), true);
  assert.equal(canPerform({ role: "MANAGER", businessId: "business-a" }, "business-a", "CUSTOMERS_EDIT"), true);
  assert.equal(canPerform({ role: "STAFF", businessId: "business-a" }, "business-a", "CUSTOMERS_EDIT"), false);
  assert.equal(canPerform({ role: "VIEWER", businessId: "business-a" }, "business-a", "CUSTOMERS_EDIT"), false);
  assert.equal(canPerform({ role: "OWNER", businessId: "business-a" }, "business-b", "CUSTOMERS_EDIT"), false);
});
