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

test("Customer Profile prioritizes the permitted operational quick action on mobile", () => {
  const page = read(
    "app/businesses/[slug]/customers/[customerId]/legacy-page.tsx",
  );
  const layout = read("app/businesses/[slug]/customers/[customerId]/layout.tsx");
  const hierarchy = read(
    "app/businesses/[slug]/customers/[customerId]/customer-profile-ux.css",
  );

  assert.match(page, /data-customer-quick-actions/);
  assert.match(page, /canEarnLoyalty \|\| canRedeemLoyalty/);
  assert.match(page, /href="#daily-loyalty"/);
  assert.match(page, /canManageCustomer \? \(/);
  assert.match(page, /href="#customer-details"/);
  assert.match(layout, /import "\.\/customer-profile-ux\.css";/);
  assert.match(
    hierarchy,
    /:has\(> a\[href="#daily-loyalty"\]\)[\s\S]*> a\[href="#daily-loyalty"\][\s\S]*order: -1;/,
  );
  assert.match(
    hierarchy,
    /:has\(> a\[href="#customer-details"\]\)[\s\S]*> a\[href="#customer-details"\]/,
  );
  assert.match(
    hierarchy,
    /:has\(> a\[href="#daily-loyalty"\]\)[\s\S]*> a\[target="_blank"\]/,
  );
  assert.doesNotMatch(hierarchy, /data-customer-reversal-actions/);
});

test("Customer correction controls stay advanced, localized, and outside the daily action layer", () => {
  const layout = read("app/businesses/[slug]/customers/[customerId]/layout.tsx");

  assert.match(
    layout,
    /<details\s+[\s\S]*data-customer-reversal-actions="true"/,
  );
  assert.match(
    layout,
    /تصحيحات العمليات المتقدمة[\s\S]*Advanced transaction corrections/,
  );
  assert.match(layout, /عكس الاستبدال[\s\S]*Reverse redemption/);
  assert.match(layout, /استرداد \/ إلغاء[\s\S]*Refund \/ Void/);
  assert.match(layout, /customers\/\$\{customerId\}\/redemption-reversal/);
  assert.match(layout, /customers\/\$\{customerId\}\/reversal/);
  assert.doesNotMatch(layout, /lg:fixed/);
  assert.doesNotMatch(layout, /lg:bottom-5/);
});
