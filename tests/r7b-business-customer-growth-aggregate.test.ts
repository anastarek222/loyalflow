import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

const overview = source("app/businesses/[slug]/page.tsx");
const growth = source("lib/dashboard/business-customer-growth.ts");

test("R7B routes the Business Overview growth chart through the aggregate", () => {
  assert.match(overview, /getBusinessCustomerGrowth\(business\.id, chartStart\)/);
  assert.doesNotMatch(overview, /createDashboardCustomerGrowth/);
  assert.doesNotMatch(overview, /customerGrowthRows/);
});

test("R7B aggregates customer growth in the database with the existing chart contract", () => {
  assert.match(growth, /prisma\.\$queryRaw/);
  assert.match(growth, /TO_CHAR\("createdAt", 'MM-DD'\)/);
  assert.match(growth, /"businessId" = \$\{businessId\}/);
  assert.match(growth, /"createdAt" >= \$\{since\}/);
  assert.match(growth, /COUNT\(\*\)::bigint AS customers/);
  assert.match(growth, /GROUP BY TO_CHAR\("createdAt", 'MM-DD'\)/);
  assert.match(growth, /ORDER BY TO_CHAR\("createdAt", 'MM-DD'\) ASC/);
  assert.match(growth, /LIMIT 31/);
});
