import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const businessOwnersPage = readFileSync(
  new URL("../app/business-owners/page.tsx", import.meta.url),
  "utf8",
);

test("Business Owners keeps plan usage fully localized in Arabic", () => {
  assert.match(businessOwnersPage, /\{isArabic \? "العملاء" : "customers"\}/);
  assert.match(businessOwnersPage, /\{isArabic \? "الفريق" : "users"\}/);
  assert.match(businessOwnersPage, /\{isArabic \? "الفروع" : "branches"\}/);
  assert.match(businessOwnersPage, /getPlanLimit\(/);
});

test("Business Owners localizes subscription lifecycle presentation without changing enum values", () => {
  assert.match(businessOwnersPage, /function subscriptionLifecycleStateLabel/);
  assert.match(businessOwnersPage, /PAST_DUE: "متأخر الدفع"/);
  assert.match(businessOwnersPage, /EXPIRED: "منتهي"/);
  assert.match(businessOwnersPage, /function subscriptionLifecycleEventLabel/);
  assert.match(businessOwnersPage, /TRIAL_STARTED: \{ ar: "بدء الفترة التجريبية", en: "Trial started" \}/);
  assert.match(businessOwnersPage, /RENEWAL_FAILED: \{ ar: "فشل التجديد", en: "Renewal failed" \}/);
  assert.match(businessOwnersPage, /name="event"/);
  assert.match(businessOwnersPage, /value="TRIAL_STARTED"/);
  assert.match(businessOwnersPage, /value="ACTIVATION_SUCCEEDED"/);
  assert.match(businessOwnersPage, /value="RENEWAL_FAILED"/);
  assert.match(businessOwnersPage, /value="GRACE_PERIOD_EXPIRED"/);
  assert.match(businessOwnersPage, /value="CANCELLATION_REQUESTED"/);
  assert.match(businessOwnersPage, /value="CANCELED_PERIOD_EXPIRED"/);
  assert.match(businessOwnersPage, /value="RECOVERY_SUCCEEDED"/);
  assert.match(
    businessOwnersPage,
    /subscriptionLifecycleStateLabel\([\s\S]*?business\.subscriptionLifecycleState,[\s\S]*?isArabic/,
  );
});

test("Business Owners exposes semantic success and error feedback", () => {
  assert.match(businessOwnersPage, /role="status"/);
  assert.match(businessOwnersPage, /role="alert"/);
});

test("Business Owners keeps authoritative billing and lifecycle actions unchanged", () => {
  assert.match(businessOwnersPage, /updateBusinessPlanAction\.bind\(/);
  assert.match(businessOwnersPage, /updateBusinessBillingAction\.bind\(/);
  assert.match(businessOwnersPage, /recordBusinessPaymentAction\.bind\(/);
  assert.match(businessOwnersPage, /transitionBusinessSubscriptionAction\.bind\(/);
  assert.match(businessOwnersPage, /name="expectedVersion"/);
  assert.match(businessOwnersPage, /business\.subscriptionLifecycleVersion/);
});
