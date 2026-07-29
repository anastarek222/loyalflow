import assert from "node:assert/strict";
import test from "node:test";

import { COUNTRY_OPTIONS } from "@/lib/onboarding/countries";
import { findCountryByIso2, getCountryDefaults, searchCountryOptions } from "@/lib/onboarding/country-search";

test("country catalog covers the complete officially assigned ISO dataset", () => {
  assert.ok(COUNTRY_OPTIONS.length >= 249);
  assert.ok(COUNTRY_OPTIONS.every((country) => country.iso2.length === 2 && country.name && country.flag && country.dialCode));
});

test("complete catalog retains country-specific currency and timezone defaults", () => {
  const egypt = findCountryByIso2(COUNTRY_OPTIONS, "EG")!;
  const india = findCountryByIso2(COUNTRY_OPTIONS, "IN")!;
  const unitedStates = findCountryByIso2(COUNTRY_OPTIONS, "US")!;
  assert.equal(egypt.currency, "EGP");
  assert.equal(india.currency, "INR");
  assert.deepEqual(getCountryDefaults(egypt).timezone, "Africa/Cairo");
  assert.equal(getCountryDefaults(unitedStates).timezoneRequiresChoice, true);
});

test("complete catalog searches name, ISO and calling code", () => {
  assert.ok(searchCountryOptions(COUNTRY_OPTIONS, "Japan").some((country) => country.iso2 === "JP"));
  assert.ok(searchCountryOptions(COUNTRY_OPTIONS, "br").some((country) => country.iso2 === "BR"));
  assert.ok(searchCountryOptions(COUNTRY_OPTIONS, "+81").some((country) => country.iso2 === "JP"));
});
