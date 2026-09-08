import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), file), "utf8");

test("page headers prioritize the primary action before secondary actions on mobile", () => {
  const header = read("components/page-layout/page-header.tsx");

  assert.match(
    header,
    /primaryAction \? \(\s*<div className="order-first sm:order-last">/,
  );
  assert.match(
    header,
    /secondaryActions \? \(\s*<div className="order-last sm:order-first">/,
  );
});

test("Customers exposes Add Customer as the primary page action", () => {
  const customers = read("app/businesses/[slug]/customers/page.tsx");
  const primaryIndex = customers.indexOf("primaryAction={");
  const addIndex = customers.indexOf("customers?add=1#add-customer");
  const secondaryIndex = customers.indexOf("secondaryActions={");

  assert.ok(primaryIndex >= 0);
  assert.ok(addIndex > primaryIndex);
  assert.ok(secondaryIndex > addIndex);
  assert.equal(
    customers.match(/customers\?add=1#add-customer/g)?.length ?? 0,
    1,
  );
  assert.match(customers, /secondaryActions=\{[\s\S]*?canScanCustomers \? \(/);
});

test("single-business dashboard entry remains role-aware instead of adding a selector step", () => {
  const dashboard = read("app/dashboard/page.tsx");

  assert.match(dashboard, /resolveRoleAwareEntry\(\{/);
  assert.match(dashboard, /if \(roleAwareEntry\) redirect\(roleAwareEntry\);/);
});

test("Scan keeps camera scanning first and alternate customer search after it", () => {
  const scan = read("app/businesses/[slug]/scan/page.tsx");
  const scannerIndex = scan.indexOf("<QrScanner");
  const searchIndex = scan.indexOf("<ScanCustomerSearch");
  const scanner = read("components/qr-scanner.tsx");
  const customerSearch = read("components/scan-customer-search.tsx");

  assert.ok(scannerIndex >= 0);
  assert.ok(searchIndex > scannerIndex);
  assert.match(scanner, /<details className="group mt-3/);
  assert.match(customerSearch, /<details[\s\S]*data-testid="scan-customer-search"/);
});
