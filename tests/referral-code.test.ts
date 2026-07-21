import assert from "node:assert/strict";
import test from "node:test";

import {
  canRecordReferral,
  createReferralCodeCandidate,
  normalizeReferralCode,
} from "@/lib/referrals/code";

test("normalizes only safe fixed-length referral codes", () => {
  assert.equal(normalizeReferralCode(" ab12cd34 "), "AB12CD34");
  assert.equal(normalizeReferralCode("bad-code"), null);
  assert.equal(normalizeReferralCode("ABCDEFGHI"), null);
});

test("creates opaque referral-code candidates", () => {
  assert.match(createReferralCodeCandidate(), /^[A-F0-9]{8}$/);
});

test("records referrals only for an active same-tenant non-self referrer", () => {
  const base = {
    businessId: "business-a",
    referrerBusinessId: "business-a",
    referrerCustomerId: "customer-a",
    referredCustomerId: "customer-b",
    referrerIsActive: true,
  };
  assert.equal(canRecordReferral(base), true);
  assert.equal(canRecordReferral({ ...base, referrerBusinessId: "business-b" }), false);
  assert.equal(canRecordReferral({ ...base, referrerCustomerId: "customer-b" }), false);
  assert.equal(canRecordReferral({ ...base, referrerIsActive: false }), false);
});
