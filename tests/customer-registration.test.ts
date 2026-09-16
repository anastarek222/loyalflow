import assert from "node:assert/strict";
import test from "node:test";
import {
  getCustomerDisplayName,
  normalizePhone,
  normalizePhoneE164,
  parseCustomerRegistration,
} from "@/lib/customers/registration";

test("normalizes Arabic separators while retaining an international prefix", () => {
  assert.equal(normalizePhone("+20 (100) 000-0000"), "+201000000000");
});

test("canonicalizes equivalent Egyptian local and international phone forms", () => {
  assert.equal(normalizePhoneE164("0100 000 0000", "Egypt"), "+201000000000");
  assert.equal(
    normalizePhoneE164("0020 100 000 0000", "Egypt"),
    "+201000000000",
  );
  assert.equal(
    normalizePhoneE164("+20 100 000 0000", "Egypt"),
    "+201000000000",
  );
});

test("rejects malformed customer registration input", () => {
  assert.equal(
    parseCustomerRegistration({
      firstName: "A",
      lastName: null,
      phone: "invalid",
    }),
    null,
  );
});

test("parses a valid self-registration input", () => {
  const registration = parseCustomerRegistration({
    firstName: " محمد ",
    lastName: " أحمد ",
    phone: "+20 100 000 0000",
  });

  assert.deepEqual(registration, {
    firstName: "محمد",
    lastName: "أحمد",
    phone: "+201000000000",
  });
  assert.equal(getCustomerDisplayName(registration!), "محمد أحمد");
});
