import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  imageFileToDataUrl,
  isValidRemoteImageUrl,
} from "@/lib/branding/image-data";
import { businessCreationSchema } from "@/lib/business/creation-input";
import {
  isValidOwnerPhone,
  optionalOwnerPhoneValue,
} from "@/lib/business-profile";

const root = process.cwd();

function validBusinessInput(overrides: Record<string, unknown> = {}) {
  return {
    name: "Coffee House",
    contactPhone: "+201000000000",
    currency: "EGP",
    timezone: "Africa/Cairo",
    industry: "Cafe",
    website: "https://coffee.example.test",
    email: "hello@coffee.example.test",
    country: "Egypt",
    city: "Cairo",
    taxNumber: "TAX-123",
    employeeCount: 4,
    ownerFirstName: "Mona",
    ownerLastName: "Ali",
    ownerEmail: "mona@coffee.example.test",
    ownerPhone: "+20 (100) 000-0000",
    ownerPassword: "a-secure-owner-password",
    logoUrl: "https://cdn.example.test/logo.png",
    loyaltyMode: "VISITS",
    unitName: "Visit",
    rewardName: "Free coffee",
    rewardThreshold: 5,
    earnAmount: 1,
    primaryColor: "#111827",
    secondaryColor: "#ffffff",
    themePreset: "DEFAULT",
    cardStyle: "CLASSIC",
    fontFamily: "INTER",
    ...overrides,
  };
}

test("owner phone is accepted, normalized, and persisted by the creation transaction", () => {
  const parsed = businessCreationSchema.safeParse(validBusinessInput());
  const action = fs.readFileSync(path.join(root, "app/businesses/actions.ts"), "utf8");

  assert.equal(parsed.success, true);
  assert.equal(optionalOwnerPhoneValue("+20 (100) 000-0000"), "+201000000000");
  assert.match(action, /phone: optionalOwnerPhoneValue\(parsed\.data\.ownerPhone\)/);
  assert.match(action, /role: "OWNER"/);
  assert.match(action, /businessId: business\.id/);
});

test("owner phone remains optional for existing and newly created users", () => {
  const parsed = businessCreationSchema.safeParse(validBusinessInput({ ownerPhone: "" }));

  assert.equal(parsed.success, true);
  assert.equal(optionalOwnerPhoneValue(""), null);
});

test("invalid owner phones are rejected after normalization", () => {
  assert.equal(isValidOwnerPhone("+20 (100) 000-0000"), true);
  assert.equal(isValidOwnerPhone("123"), false);
  assert.equal(isValidOwnerPhone("+20-ABC-0000"), false);
  assert.equal(
    businessCreationSchema.safeParse(validBusinessInput({ ownerPhone: "123" })).success,
    false,
  );
});

test("business creation accepts safe logo URLs and the settings upload format", async () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const logo = new File([png], "logo.png", { type: "image/png" });
  const dataUrl = await imageFileToDataUrl(logo, 500 * 1024);
  const action = fs.readFileSync(path.join(root, "app/businesses/actions.ts"), "utf8");

  assert.equal(businessCreationSchema.safeParse(validBusinessInput()).success, true);
  assert.ok(dataUrl?.startsWith("data:image/png;base64,"));
  assert.match(action, /imageFileToDataUrl\(logoFile, 500 \* 1024\)/);
  assert.match(action, /logoUrl: finalLogoUrl/);
});

test("business creation rejects unsafe logo URLs and invalid uploads", async () => {
  const invalidLogo = new File(["not an image"], "logo.png", { type: "image/png" });

  assert.equal(isValidRemoteImageUrl("javascript:alert(1)"), false);
  assert.equal(
    businessCreationSchema.safeParse(
      validBusinessInput({ logoUrl: "javascript:alert(1)" }),
    ).success,
    false,
  );
  assert.equal(await imageFileToDataUrl(invalidLogo, 500 * 1024), null);
});

test("existing onboarding fields and the isolated business-owner transaction remain intact", () => {
  const parsed = businessCreationSchema.safeParse(validBusinessInput());
  const action = fs.readFileSync(path.join(root, "app/businesses/actions.ts"), "utf8");

  assert.equal(parsed.success, true);
  assert.deepEqual(
    {
      loyaltyMode: parsed.data.loyaltyMode,
      rewardThreshold: parsed.data.rewardThreshold,
      primaryColor: parsed.data.primaryColor,
      themePreset: parsed.data.themePreset,
    },
    {
      loyaltyMode: "VISITS",
      rewardThreshold: 5,
      primaryColor: "#111827",
      themePreset: "DEFAULT",
    },
  );
  assert.match(action, /prisma\.\$transaction/);
  assert.match(action, /transaction\.business\.create/);
  assert.match(action, /transaction\.user\.create/);
});
