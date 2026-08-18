import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const businessOwnersPage = readFileSync(
  new URL("../app/business-owners/page.tsx", import.meta.url),
  "utf8",
);

test("Business Owners localizes payment states and billing intervals in Arabic", () => {
  assert.match(businessOwnersPage, /function paymentStatusLabel/);
  assert.match(businessOwnersPage, /DUE_SOON: "مستحق قريبًا"/);
  assert.match(businessOwnersPage, /function localizedIntervalLabel/);
  assert.match(businessOwnersPage, /"دورة الفوترة"/);
  assert.match(businessOwnersPage, /"حالة الدفع"/);
  assert.match(businessOwnersPage, /"كل 15 يومًا"/);
  assert.match(businessOwnersPage, /paymentStatusLabel\(derivedState, isArabic\)/);
});

test("Business Owners localizes billing field labels without changing field names", () => {
  assert.match(businessOwnersPage, /name="billingCustomDays"[\s\S]*?"أيام مخصصة"/);
  assert.match(businessOwnersPage, /name="subscriptionAmount"[\s\S]*?"المبلغ"/);
  assert.match(businessOwnersPage, /name="billingCurrency"[\s\S]*?"العملة"/);
  assert.match(businessOwnersPage, /name="subscriptionStartDate"[\s\S]*?"تاريخ البدء"/);
  assert.match(businessOwnersPage, /name="nextPaymentDate"[\s\S]*?"الدفعة القادمة"/);
  assert.match(businessOwnersPage, /name="lastPaymentDate"[\s\S]*?"آخر دفعة"/);
  assert.match(businessOwnersPage, /name="gracePeriodDays"[\s\S]*?"أيام السماح"/);
  assert.match(businessOwnersPage, /name="paymentMethod"[\s\S]*?"طريقة الدفع"/);
  assert.match(businessOwnersPage, /name="billingNotes"[\s\S]*?"ملاحظات الدفع"/);
  assert.match(businessOwnersPage, /name="adminNotes"[\s\S]*?"ملاحظات الإدارة الداخلية"/);
});

test("Business Owners keeps authoritative billing behavior unchanged", () => {
  assert.match(businessOwnersPage, /derivePaymentState\(\{/);
  assert.match(businessOwnersPage, /updateBusinessBillingAction\.bind\(/);
  assert.match(businessOwnersPage, /recordBusinessPaymentAction\.bind\(/);
  assert.match(businessOwnersPage, /transitionBusinessSubscriptionAction\.bind\(/);
});
