import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  addBillingInterval,
  billingInputSchema,
  derivePaymentState,
  monthlyRecurringMinor,
  parseMoneyToMinor,
} from "@/lib/billing/subscription";

const root = process.cwd();

function source(file: string) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

test("F19.2 parses subscription amounts into integer minor units", () => {
  assert.equal(parseMoneyToMinor("1500"), 150000);
  assert.equal(parseMoneyToMinor("1500.5"), 150050);
  assert.equal(parseMoneyToMinor("1500.50"), 150050);
  assert.equal(parseMoneyToMinor("1500.555"), null);
  assert.equal(parseMoneyToMinor("-1"), null);
});

test("F19.2 supports 15-day, monthly, quarterly, semiannual, annual and custom billing", () => {
  const base = new Date("2026-07-26T00:00:00.000Z");

  assert.equal(addBillingInterval(base, "FIFTEEN_DAYS").toISOString().slice(0, 10), "2026-08-10");
  assert.equal(addBillingInterval(base, "MONTHLY").toISOString().slice(0, 10), "2026-08-26");
  assert.equal(addBillingInterval(base, "QUARTERLY").toISOString().slice(0, 10), "2026-10-26");
  assert.equal(addBillingInterval(base, "SEMIANNUAL").toISOString().slice(0, 10), "2027-01-26");
  assert.equal(addBillingInterval(base, "ANNUAL").toISOString().slice(0, 10), "2027-07-26");
  assert.equal(addBillingInterval(base, "CUSTOM", 20).toISOString().slice(0, 10), "2026-08-15");
  assert.equal(
    addBillingInterval(new Date("2026-01-31T00:00:00.000Z"), "MONTHLY").toISOString().slice(0, 10),
    "2026-02-28",
  );
});

test("F19.2 derives due-soon, due and overdue states from the next payment date", () => {
  const now = new Date("2026-07-26T12:00:00.000Z");

  assert.equal(
    derivePaymentState({
      paymentStatus: "PAID",
      nextPaymentDate: new Date("2026-07-30T00:00:00.000Z"),
      gracePeriodDays: 3,
    }, now),
    "DUE_SOON",
  );

  assert.equal(
    derivePaymentState({
      paymentStatus: "PAID",
      nextPaymentDate: new Date("2026-07-26T00:00:00.000Z"),
      gracePeriodDays: 3,
    }, now),
    "DUE",
  );

  assert.equal(
    derivePaymentState({
      paymentStatus: "PAID",
      nextPaymentDate: new Date("2026-07-20T00:00:00.000Z"),
      gracePeriodDays: 3,
    }, now),
    "OVERDUE",
  );
});

test("F19.2 normalizes recurring value for dashboard subscription KPIs", () => {
  assert.equal(monthlyRecurringMinor(150000, "MONTHLY"), 150000);
  assert.equal(monthlyRecurringMinor(450000, "QUARTERLY"), 150000);
  assert.equal(monthlyRecurringMinor(900000, "SEMIANNUAL"), 150000);
  assert.equal(monthlyRecurringMinor(1800000, "ANNUAL"), 150000);
  assert.equal(monthlyRecurringMinor(75000, "FIFTEEN_DAYS"), 150000);
});

test("F19.2 validates custom billing and keeps notes bounded", () => {
  assert.equal(
    billingInputSchema.safeParse({
      billingInterval: "CUSTOM",
      billingCustomDays: "21",
      subscriptionAmount: "1500.00",
      billingCurrency: "EGP",
      paymentStatus: "PAID",
      gracePeriodDays: "3",
    }).success,
    true,
  );

  assert.equal(
    billingInputSchema.safeParse({
      billingInterval: "CUSTOM",
      subscriptionAmount: "1500",
      billingCurrency: "EGP",
      paymentStatus: "PAID",
      gracePeriodDays: "3",
    }).success,
    false,
  );
});

test("F19.2 persists billing on Business with a committed migration and indexes", () => {
  const schema = source("prisma/schema.prisma");
  const migration = source("prisma/migrations/20260726220000_add_business_subscription_billing/migration.sql");

  assert.match(schema, /billingInterval\s+BillingInterval/);
  assert.match(schema, /nextPaymentDate\s+DateTime\?/);
  assert.match(schema, /subscriptionAmountMinor\s+Int\?/);
  assert.match(schema, /paymentStatus\s+PaymentStatus/);
  assert.match(migration, /CREATE TYPE "BillingInterval"/);
  assert.match(migration, /Business_paymentStatus_nextPaymentDate_idx/);
});

test("F19.2 new-business onboarding includes billing before the business is created", () => {
  const wizard = source("components/business-setup-wizard.tsx");
  const action = source("app/businesses/actions.ts");

  assert.match(wizard, /"Billing"/);
  assert.match(wizard, /name="billingInterval"/);
  assert.match(wizard, /name="nextPaymentDate"/);
  assert.match(wizard, /name="subscriptionAmount"/);
  assert.match(action, /subscriptionAmountMinor/);
  assert.match(action, /billingInterval: parsed\.data\.billingInterval/);
});

test("F19.2 Super Admin operations expose billing, payment recording and suspension without tenant-role expansion", () => {
  const page = source("app/business-owners/page.tsx");
  const actions = source("app/business-owners/actions.ts");
  const dashboard = source("app/dashboard/page.tsx");

  assert.match(page, /Manage subscription/);
  assert.match(page, /Record payment now/);
  assert.match(page, /Suspend business/);
  assert.match(actions, /session\.user\.role !== "SUPER_ADMIN"/);
  assert.match(actions, /recordBusinessPaymentAction/);
  assert.match(actions, /setBusinessPlatformStatusAction/);
  assert.match(source("scripts/verify-f19-migration-target.ts"), /loyalflow_test/);
  assert.match(dashboard, /overdueSubscriptions/);
  assert.match(dashboard, /recurringSummary/);
});
