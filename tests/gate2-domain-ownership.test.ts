import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  BUSINESS_DOMAIN_FIELDS,
  LEGACY_BUSINESS_FIELD_CLASSIFICATION,
  LEGACY_SETTINGS_PROTECTED_FIELDS,
  pickOwnedFields,
} from "@/lib/business/domain-ownership";
import {
  businessIdentitySchema,
  loyaltyProgramSchema,
  validateCountryProfile,
} from "@/lib/business/domain-validation";
import { businessCreationSchema } from "@/lib/business/creation-input";
import { getAuthorizedCardDesignUpdate } from "@/lib/cards/card-design-permissions";
import {
  businessPlaybooks,
  getPlaybookApplicationPlan,
} from "@/lib/playbooks/catalog";

const settingsActionSource = readFileSync(
  new URL(
    "../app/businesses/[slug]/settings/actions.ts",
    import.meta.url,
  ),
  "utf8",
);
const settingsFormSource = readFileSync(
  new URL("../components/business-settings-form.tsx", import.meta.url),
  "utf8",
);
const settingsPageSource = readFileSync(
  new URL("../app/businesses/[slug]/settings/page.tsx", import.meta.url),
  "utf8",
);
const themeSource = readFileSync(
  new URL("../lib/theme.ts", import.meta.url),
  "utf8",
);

test("domain ownership keeps one logo source and protects the legacy writer", () => {
  assert.ok(BUSINESS_DOMAIN_FIELDS.CARD_DESIGN.includes("logoUrl"));
  assert.ok(LEGACY_SETTINGS_PROTECTED_FIELDS.includes("logoUrl"));
  assert.match(settingsPageSource, /name="logoFile"/);
  assert.match(settingsPageSource, /name="logoUrl"/);
  assert.match(
    settingsActionSource,
    /data: \{ \.\.\.authorizedUpdate\.data, logoUrl: finalLogoUrl \}/,
  );

  const legacyUpdate = settingsActionSource.slice(
    settingsActionSource.indexOf("export async function updateBusinessProfileAction"),
    settingsActionSource.indexOf("export async function updateBusinessCardDesignAction"),
  );
  assert.doesNotMatch(legacyUpdate, /logoUrl:\s*finalLogoUrl/);
  assert.doesNotMatch(legacyUpdate, /primaryColor:\s*parsed\.data/);
  assert.doesNotMatch(legacyUpdate, /themePreset:\s*parsed\.data/);
});

test("identity normalization is shared and canonical", () => {
  const identity = businessIdentitySchema.parse({
    name: "  XTV Company  ",
    industry: "",
    description: "",
    email: "",
    contactPhone: "+20 101 234 5678",
    website: "xtvco.com",
    country: "Egypt",
    city: "Cairo",
    address: "",
    currency: "EGP",
    timezone: "Africa/Cairo",
    taxNumber: "",
    employeeCount: "4",
  });
  assert.equal(identity.name, "XTV Company");
  assert.equal(identity.website, "https://xtvco.com/");
  assert.equal(identity.contactPhone, "+20 101 234 5678");
  assert.equal(
    validateCountryProfile({
      country: identity.country,
      currency: identity.currency,
      timezone: identity.timezone,
    }),
    null,
  );
});

test("Add Business and Owner use the same loyalty semantics", () => {
  const milestone = {
    loyaltyMode: "POINTS",
    unitName: "Recommendation",
    earnAmount: "10",
    rewardThreshold: "1000",
    rewardName: "Free annual plan",
  } as const;
  const shared = loyaltyProgramSchema.parse(milestone);
  assert.deepEqual(shared, {
    loyaltyMode: "POINTS",
    unitName: "Recommendation",
    earnAmount: 10,
    rewardThreshold: 1000,
    rewardName: "Free annual plan",
  });

  const creation = businessCreationSchema.safeParse({
    name: "Domain Test",
    contactPhone: "",
    currency: "EGP",
    timezone: "Africa/Cairo",
    industry: "",
    website: "",
    email: "",
    country: "Egypt",
    city: "",
    taxNumber: "",
    employeeCount: "0",
    ownerFirstName: "Owner",
    ownerLastName: "",
    ownerEmail: "domain-owner@example.test",
    ownerPhone: "",
    ownerPassword: "SecurePassword123!",
    logoUrl: "",
    ...milestone,
    primaryColor: "#111827",
    secondaryColor: "#FFFFFF",
    themePreset: "DEFAULT",
    cardStyle: "CLASSIC",
    fontFamily: "INTER",
    standardCardArtworkEnabled: "true",
    standardCardArtworkCategory: "OTHER",
    billingInterval: "MONTHLY",
    subscriptionStartDate: "",
    nextPaymentDate: "",
    lastPaymentDate: "",
    subscriptionAmount: "",
    billingCurrency: "EGP",
    paymentStatus: "TRIAL",
    gracePeriodDays: "3",
  });
  assert.equal(creation.success, true);
  if (creation.success) {
    assert.deepEqual(
      pickOwnedFields(creation.data, [
        "loyaltyMode",
        "unitName",
        "earnAmount",
        "rewardThreshold",
        "rewardName",
      ]),
      shared,
    );
  }
});

test("mode, unit, target, reward and earn amount remain distinct", () => {
  assert.deepEqual(BUSINESS_DOMAIN_FIELDS.LOYALTY_PROGRAM.slice(0, 5), [
    "loyaltyMode",
    "unitName",
    "earnAmount",
    "rewardThreshold",
    "rewardName",
  ]);
});

test("playbooks update the default milestone but never create catalogue records", () => {
  const plan = getPlaybookApplicationPlan(businessPlaybooks.BARBER);
  assert.equal(plan.businessUpdate.rewardThreshold, 5);
  assert.equal(plan.businessUpdate.rewardName, "حلاقة مجانية");
  assert.deepEqual(plan.creates, {
    rewards: 0,
    promotions: 0,
    offers: 0,
    campaigns: 0,
  });
});

test("legacy fields have an explicit non-destructive classification", () => {
  assert.deepEqual(Object.keys(LEGACY_BUSINESS_FIELD_CLASSIFICATION).sort(), [
    "backgroundColor",
    "buttonStyle",
    "cardStyle",
    "fontFamily",
    "membershipName",
    "pointsName",
    "qrPosition",
    "qrStyle",
    "secondaryColor",
    "themePreset",
  ]);
  assert.equal(
    LEGACY_BUSINESS_FIELD_CLASSIFICATION.cardStyle,
    "DEPRECATED_READ_ONLY",
  );
});

test("Owner and Super Admin card permissions remain isolated", () => {
  const submitted = {
    cardDesignMode: "STANDARD" as const,
    primaryColor: "#123456",
    themePreset: "DARK" as const,
    standardCardArtworkEnabled: true,
    standardCardArtworkCategory: "CAFE" as const,
    customCardArtworkEnabled: false,
    customCardFrontArtworkUrl: "",
    customCardBackArtworkUrl: "",
    customCardSafeZoneVersion: "ID1_V1" as const,
  };
  assert.equal(
    getAuthorizedCardDesignUpdate({
      role: "OWNER",
      currentDesignMode: "CUSTOM",
      submitted,
    }).allowed,
    false,
  );
  assert.equal(
    getAuthorizedCardDesignUpdate({
      role: "SUPER_ADMIN",
      currentDesignMode: "CUSTOM",
      submitted,
    }).allowed,
    true,
  );
});

test("customer experience remains active without expanding internal theming", () => {
  assert.match(settingsFormSource, /name="coverImageFile"/);
  assert.match(settingsFormSource, /name="instagramUrl"/);
  assert.match(settingsFormSource, /name="cardDefaultLanguage"/);
  assert.match(themeSource, /getCustomerExperienceTheme/);
  assert.match(themeSource, /@deprecated Authenticated app pages/);
});

test("Settings has one card editor and omits legacy compatibility fields", () => {
  assert.equal(
    (settingsPageSource.match(/<StandardCardSetup/g) ?? []).length,
    1,
  );
  assert.doesNotMatch(settingsFormSource, /معاينة مباشرة للكارت|themeOptions|cardStyleOptions|logoFile/);
  assert.doesNotMatch(
    settingsFormSource,
    /Facebook URL|TikTok URL|شكل رمز QR|مكان رمز QR|اسم العضوية|Typography/,
  );

  for (const field of [
    "facebookUrl",
    "tiktokUrl",
    "qrStyle",
    "qrPosition",
    "membershipName",
  ]) {
    assert.doesNotMatch(
      settingsFormSource,
      new RegExp(`name="${field}"`),
    );
  }

  assert.doesNotMatch(settingsPageSource, /href=\{`\/businesses\/\$\{business\.slug\}\/(?:rewards|playbooks)`\}/);
  assert.match(settingsPageSource, /Google Sheets integration/);
});
