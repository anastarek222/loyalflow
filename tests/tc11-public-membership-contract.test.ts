import assert from "node:assert/strict";
import test from "node:test";
import {
  publicMembershipRegistrationProblemCodes,
  type PublicMembershipRegistration,
} from "@loyalflow/contracts/customers/public-membership";
import { parseCustomerRegistration } from "@/lib/customers/registration";

test("TC1.1 publishes the existing public registration problem codes", () => {
  assert.deepEqual(publicMembershipRegistrationProblemCodes, {
    invalidInput: "invalid",
    businessUnavailable: "unavailable",
    rateLimited: "rate-limit",
    duplicateMembership: "duplicate",
    customerLimitReached: "plan-limit",
  });
});

test("TC1.1 registration adapter returns the transport-neutral contract", () => {
  const registration: PublicMembershipRegistration | null =
    parseCustomerRegistration({
      firstName: " محمد ",
      lastName: " أحمد ",
      phone: "+20 100 000 0000",
    });

  assert.deepEqual(registration, {
    firstName: "محمد",
    lastName: "أحمد",
    phone: "+201000000000",
  });
});
