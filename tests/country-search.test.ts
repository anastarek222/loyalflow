import assert from "node:assert/strict";
import test from "node:test";

import {
  findCountryByIso2,
  getCountryDefaults,
  searchCountryOptions,
  type CountryOption,
} from "../lib/onboarding/country-search";

const countries: CountryOption[] = [
  {
    iso2: "EG",
    name: "Egypt",
    flag: "🇪🇬",
    dialCode: "+20",
    currency: "EGP",
    timezones: ["Africa/Cairo"],
  },
  {
    iso2: "US",
    name: "United States",
    flag: "🇺🇸",
    dialCode: "+1",
    currency: "USD",
    timezones: ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles"],
  },
  {
    iso2: "AE",
    name: "United Arab Emirates",
    flag: "🇦🇪",
    dialCode: "+971",
    currency: "AED",
    timezones: ["Asia/Dubai"],
  },
];

test("country search matches by name", () => {
  assert.deepEqual(searchCountryOptions(countries, "egypt").map((country) => country.iso2), ["EG"]);
});

test("country search matches by ISO code", () => {
  assert.deepEqual(searchCountryOptions(countries, "ae").map((country) => country.iso2), ["AE"]);
});

test("country search matches by calling code", () => {
  assert.deepEqual(searchCountryOptions(countries, "+971").map((country) => country.iso2), ["AE"]);
});

test("single-timezone country can be safely prefilled", () => {
  assert.deepEqual(getCountryDefaults(countries[0]), {
    dialCode: "+20",
    currency: "EGP",
    timezone: "Africa/Cairo",
    timezoneRequiresChoice: false,
  });
});

test("multi-timezone country requires explicit timezone choice", () => {
  assert.deepEqual(getCountryDefaults(countries[1]), {
    dialCode: "+1",
    currency: "USD",
    timezone: "",
    timezoneRequiresChoice: true,
  });
});

test("country lookup normalizes ISO code", () => {
  assert.equal(findCountryByIso2(countries, " eg ")?.name, "Egypt");
});
