import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

const dashboard = source("app/dashboard/page.tsx");
const summary = source("lib/dashboard/super-admin-billing-summary.ts");

test("R7A removes the unbounded Super Admin billing row load from the dashboard", () => {
  assert.match(dashboard, /getSuperAdminBillingSummary\(today\)/);
  assert.doesNotMatch(dashboard, /billingBusinesses/);
  assert.doesNotMatch(dashboard, /derivePaymentState/);
  assert.doesNotMatch(dashboard, /monthlyRecurringMinor/);
});

test("R7A preserves the canonical derived billing state branches in the aggregate", () => {
  for (const state of ["SUSPENDED", "TRIAL", "OVERDUE", "DUE", "DUE_SOON", "PAID"]) {
    assert.match(summary, new RegExp(`'${state}'`));
  }

  assert.match(summary, /"nextPaymentDate"::date/);
  assert.match(summary, /-"gracePeriodDays"/);
});

test("R7A preserves every recurring interval formula and bounds the returned currency rows", () => {
  for (const interval of [
    "FIFTEEN_DAYS",
    "MONTHLY",
    "QUARTERLY",
    "SEMIANNUAL",
    "ANNUAL",
    "CUSTOM",
  ]) {
    assert.match(summary, new RegExp(`'${interval}'`));
  }

  assert.match(summary, /30\.4375/);
  assert.match(summary, /GROUP BY currency/);
  assert.match(summary, /LIMIT 2/);
  assert.match(summary, /prisma\.\$queryRaw/);
});
