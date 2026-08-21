import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  customerFeedbackUrl,
  getCustomerPlanLimitMessage,
  parseCustomerFeedbackCode,
} from "../lib/customers/feedback";

const root = process.cwd();
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("customer feedback codes are parsed through one typed contract", () => {
  assert.equal(parseCustomerFeedbackCode("invalid"), "invalid");
  assert.equal(parseCustomerFeedbackCode("phone"), "phone");
  assert.equal(parseCustomerFeedbackCode("duplicate"), "duplicate");
  assert.equal(parseCustomerFeedbackCode("plan-limit"), "plan-limit");
  assert.equal(
    parseCustomerFeedbackCode("subscription-restricted"),
    "subscription-restricted",
  );
  assert.equal(parseCustomerFeedbackCode("unknown"), null);
  assert.equal(parseCustomerFeedbackCode(null), null);
});

test("customer feedback URLs preserve the canonical customers error query", () => {
  assert.equal(
    customerFeedbackUrl("demo-business", "plan-limit"),
    "/businesses/demo-business/customers?error=plan-limit",
  );
});

test("customer plan limit feedback is explicit in English and Arabic", () => {
  assert.match(getCustomerPlanLimitMessage("en"), /customer limit/i);
  assert.match(getCustomerPlanLimitMessage("en"), /upgrade your plan/i);
  assert.match(getCustomerPlanLimitMessage("ar"), /الحد الأقصى للعملاء/);
  assert.match(getCustomerPlanLimitMessage("ar"), /ترقية الباقة/);
});

test("customer actions use the typed feedback URL for plan limits", () => {
  const actions = source("app/businesses/[slug]/customers/actions.ts");

  assert.match(actions, /customerFeedbackUrl\(slug, "plan-limit"\)/);
  assert.doesNotMatch(actions, /customers\?error=plan-limit/);
});

test("plan limit feedback renders only on the customers surface", () => {
  const banner = source("components/customer-feedback-banner.tsx");
  const layout = source("app/layout.tsx");

  assert.match(banner, /customersPathPattern/);
  assert.match(banner, /feedbackCode !== "plan-limit"/);
  assert.match(banner, /role="alert"/);
  assert.match(banner, /getCustomerPlanLimitMessage\(locale\)/);
  assert.match(layout, /<Suspense fallback=\{null\}>/);
  assert.match(layout, /<CustomerFeedbackBanner locale=\{locale\} \/>/);
});
