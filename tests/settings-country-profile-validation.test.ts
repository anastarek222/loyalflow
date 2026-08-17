import assert from "node:assert/strict";
import test from "node:test";

import { businessProfileSettingsSchema } from "@/lib/business/settings-domains";

function profile(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    name: "LoyalFlow Beta",
    coverImageUrl: "",
    currency: "",
    timezone: "",
    industry: "",
    website: "",
    email: "",
    country: "",
    city: "",
    taxNumber: "",
    employeeCount: 0,
    description: "",
    instagramUrl: "",
    ...overrides,
  };
}

function issuePath(result: ReturnType<typeof businessProfileSettingsSchema.safeParse>) {
  assert.equal(result.success, false);
  if (result.success) return "";
  return result.error.issues[0]?.path.join(".") ?? "";
}

test("Settings keeps the fully empty legacy country profile valid", () => {
  assert.equal(businessProfileSettingsSchema.safeParse(profile()).success, true);
});

test("Settings accepts a canonical country, currency and timezone profile", () => {
  assert.equal(
    businessProfileSettingsSchema.safeParse(
      profile({
        country: "Egypt",
        currency: "EGP",
        timezone: "Africa/Cairo",
      }),
    ).success,
    true,
  );
});

test("Settings rejects a partial country profile", () => {
  const result = businessProfileSettingsSchema.safeParse(
    profile({ country: "Egypt", currency: "EGP" }),
  );
  assert.equal(issuePath(result), "timezone");
});

test("Settings rejects an unknown country", () => {
  const result = businessProfileSettingsSchema.safeParse(
    profile({
      country: "Not a country",
      currency: "EGP",
      timezone: "Africa/Cairo",
    }),
  );
  assert.equal(issuePath(result), "country");
});

test("Settings rejects an unsupported currency", () => {
  const result = businessProfileSettingsSchema.safeParse(
    profile({
      country: "Egypt",
      currency: "ZZZ",
      timezone: "Africa/Cairo",
    }),
  );
  assert.equal(issuePath(result), "currency");
});

test("Settings rejects an invalid timezone", () => {
  const result = businessProfileSettingsSchema.safeParse(
    profile({
      country: "Egypt",
      currency: "EGP",
      timezone: "Invalid/Timezone",
    }),
  );
  assert.equal(issuePath(result), "timezone");
});

test("Settings rejects a timezone that does not belong to the selected country", () => {
  const result = businessProfileSettingsSchema.safeParse(
    profile({
      country: "Egypt",
      currency: "EGP",
      timezone: "Asia/Riyadh",
    }),
  );
  assert.equal(issuePath(result), "timezone");
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(
      result.error.issues.some(
        (issue) => issue.message === "COUNTRY_TIMEZONE_MISMATCH",
      ),
    );
  }
});
