import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (file: string) =>
  readFileSync(join(process.cwd(), file), "utf8");

test("mobile Scan opens at the camera while desktop retains guidance", () => {
  const scan = source("app/businesses/[slug]/scan/page.tsx");

  assert.match(scan, /className="hidden gap-3 p-4 sm:flex/);
  assert.match(scan, /<h1 className="sr-only sm:hidden">/);
  assert.match(scan, /mb-3 hidden items-start[\s\S]*sm:flex/);
  assert.match(scan, /<QrScanner businessId=\{business\.id\}/);
  assert.match(scan, /<ScanCustomerSearch businessId=\{business\.id\}/);
});

test("mobile Customers keeps secondary operations collapsed and rows compact", () => {
  const customers = source("app/businesses/[slug]/customers/page.tsx");
  const bulk = source("components/bulk-customer-operations.tsx");

  assert.match(bulk, /<details className="group mb-3/);
  assert.match(customers, /open=\{filtersActive \|\| undefined\}/);
  assert.match(customers, /grid min-h-\[4\.75rem\]/);
  assert.match(
    customers,
    /href=\{`\/businesses\/\$\{business\.slug\}\/customers\/\$\{customer\.id\}`\}/,
  );
  assert.doesNotMatch(customers, /className="text-2xl font-bold text-foreground"/);
});

test("customer details exposes fast mobile actions and compact closed sections", () => {
  const detail = source(
    "app/businesses/[slug]/customers/[customerId]/page.tsx",
  );
  const disclosure = source(
    "components/customer-profile/operational-disclosure.tsx",
  );

  assert.match(detail, /data-customer-quick-actions/);
  assert.match(detail, /href=\{`\/card\/\$\{customer\.publicToken\}`\}/);
  assert.match(detail, /href="#customer-details"/);
  assert.match(detail, /id="customer-details"/);
  assert.match(disclosure, /min-h-12[\s\S]*sm:min-h-16/);
  assert.match(disclosure, /mt-0\.5 hidden[\s\S]*sm:block/);
});
