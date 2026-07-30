import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { getAuthorizedCardDesignUpdate } from "@/lib/cards/card-design-permissions";
import { findCountryByCanonicalText } from "@/lib/onboarding/country-search";
import { COUNTRY_OPTIONS } from "@/lib/onboarding/countries";

const root = process.cwd();
const source = (file: string) =>
  fs.readFileSync(path.join(root, file), "utf8");

const standardSubmission = {
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

test("Owner saves preserve an existing Custom Card without accepting custom changes", () => {
  const result = getAuthorizedCardDesignUpdate({
    role: "OWNER",
    currentDesignMode: "CUSTOM",
    submitted: {
      ...standardSubmission,
      cardDesignMode: "CUSTOM",
      customCardArtworkEnabled: true,
      customCardFrontArtworkUrl: "https://attacker.example/front.png",
      customCardBackArtworkUrl: "https://attacker.example/back.png",
    },
  });

  assert.deepEqual(result, {
    allowed: false,
    reason: "CUSTOM_READ_ONLY",
  });
});

test("Owner cannot activate Custom or write any custom-card field", () => {
  const activation = getAuthorizedCardDesignUpdate({
    role: "OWNER",
    currentDesignMode: "STANDARD",
    submitted: {
      ...standardSubmission,
      cardDesignMode: "CUSTOM",
      customCardArtworkEnabled: true,
      customCardFrontArtworkUrl: "https://example.test/front.png",
      customCardBackArtworkUrl: "https://example.test/back.png",
    },
  });
  assert.deepEqual(activation, {
    allowed: false,
    reason: "CUSTOM_FORBIDDEN",
  });

  const standard = getAuthorizedCardDesignUpdate({
    role: "OWNER",
    currentDesignMode: "STANDARD",
    submitted: standardSubmission,
  });
  assert.equal(standard.allowed, true);
  if (standard.allowed) {
    assert.equal(standard.data.cardDesignMode, "STANDARD");
    assert.equal("customCardArtworkEnabled" in standard.data, false);
    assert.equal("customCardFrontArtworkUrl" in standard.data, false);
    assert.equal("customCardBackArtworkUrl" in standard.data, false);
    assert.equal("customCardSafeZoneVersion" in standard.data, false);
  }
});

test("Super Admin retains complete Standard and Custom Card control", () => {
  const custom = getAuthorizedCardDesignUpdate({
    role: "SUPER_ADMIN",
    currentDesignMode: "STANDARD",
    submitted: {
      ...standardSubmission,
      cardDesignMode: "CUSTOM",
      customCardArtworkEnabled: true,
      customCardFrontArtworkUrl: "https://cdn.example.test/front.png",
      customCardBackArtworkUrl: "https://cdn.example.test/back.png",
    },
  });

  assert.equal(custom.allowed, true);
  if (custom.allowed) {
    assert.equal(custom.data.cardDesignMode, "CUSTOM");
    assert.equal(custom.data.customCardArtworkEnabled, true);
    assert.equal(
      custom.data.customCardFrontArtworkUrl,
      "https://cdn.example.test/front.png",
    );
    assert.equal(custom.data.customCardSafeZoneVersion, "ID1_V1");
  }
});

test("Owner card protection is enforced by persisted server state", () => {
  const action = source("app/businesses/[slug]/settings/actions.ts");
  assert.match(action, /select: \{ id: true, slug: true, cardDesignMode: true \}/);
  assert.match(action, /getAuthorizedCardDesignUpdate/);
  assert.match(action, /currentDesignMode: business\.cardDesignMode/);
  assert.doesNotMatch(
    action,
    /session\.user\.role === "SUPER_ADMIN" \? parsed\.data\.customCardFrontArtworkUrl/,
  );
});

test("Owner onboarding has one canonical writer for card brand fields", () => {
  const wizard = source("components/owner-onboarding-wizard.tsx");
  const setup = source("components/standard-card-setup.tsx");

  assert.equal(wizard.match(/name="logoFile"/g)?.length, 1);
  assert.equal(wizard.match(/name="logoUrl"/g)?.length, 1);
  assert.equal(wizard.match(/name="primaryColor"/g)?.length ?? 0, 0);
  assert.equal(wizard.match(/name="themePreset"/g)?.length ?? 0, 0);
  assert.match(
    wizard,
    /Logo and card branding are configured once in Loyalty Card/,
  );
  assert.match(setup, /name="primaryColor"/);
  assert.match(setup, /name="themePreset"/);
  assert.doesNotMatch(
    setup,
    /type="radio"\s+name="themePreset"/,
  );
});

test("Owner Step 1 transition closes overlays, exposes state, focuses and announces Step 2", () => {
  const wizard = source("components/owner-onboarding-wizard.tsx");
  for (const checkpoint of [
    "OWNER_NEXT_CLICK",
    "OWNER_STEP1_VALID",
    "OWNER_STEP_CHANGE_2",
    "OWNER_STEP_RENDER_2",
  ]) {
    assert.match(wizard, new RegExp(checkpoint));
  }
  assert.match(wizard, /process\.env\.NODE_ENV === "development"/);
  assert.match(wizard, /countrySelectorRef\.current\?\.close\(\)/);
  assert.match(wizard, /data-owner-step=\{step \+ 1\}/);
  assert.match(
    wizard,
    /node\.dataset\.ownerHydrated = "true"/,
  );
  assert.match(wizard, /aria-live="polite"/);
  assert.match(wizard, /target\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(wizard, /target\?\.scrollIntoView/);
});

test("Country search submits only a canonical selection and closes safely", () => {
  assert.equal(
    findCountryByCanonicalText(COUNTRY_OPTIONS, "egypt")?.iso2,
    "EG",
  );
  assert.equal(
    findCountryByCanonicalText(COUNTRY_OPTIONS, "EG")?.name,
    "Egypt",
  );
  assert.equal(
    findCountryByCanonicalText(COUNTRY_OPTIONS, "not a country"),
    null,
  );

  const selector = source("components/onboarding/country-selector.tsx");
  assert.match(selector, /type="hidden" name=\{name\} value=\{value\}/);
  assert.doesNotMatch(selector, /id=\{id\}\s+name=\{name\}/);
  assert.match(selector, /document\.addEventListener\("click"/);
  assert.match(
    selector,
    /window\.setTimeout\(\(\) => commitTypedValue\(query\), 0\)/,
  );
  assert.match(selector, /onClick=\{\(\) => setOpen\(true\)\}/);
  assert.match(selector, /event\.key === "Escape"/);
  assert.match(selector, /setOpen\(false\)/);
  assert.doesNotMatch(selector, /className="absolute/);
});

test("Owner creation schedules the canonical non-blocking Sheets sync only after commit", () => {
  const ownerAction = source("app/onboarding/actions.ts");
  const superAdminAction = source("app/businesses/actions.ts");
  const scheduler = source("lib/google-sheets-sync-scheduler.ts");
  const safeSync = source("lib/google-sheets-sync-safe.ts");

  const transaction = ownerAction.indexOf("prisma.$transaction");
  const schedule = ownerAction.indexOf(
    "scheduleBusinessGoogleSheetsSync(business.id)",
  );
  assert.ok(transaction >= 0 && schedule > transaction);
  assert.match(scheduler, /after\(async \(\) =>/);
  assert.match(scheduler, /await syncBusinessToGoogleSheetSafely\(businessId\)/);
  assert.match(
    superAdminAction,
    /scheduleBusinessGoogleSheetsSync\(createdBusiness\.id\)/,
  );
  assert.match(
    safeSync,
    /googleSheetsSyncState: "FAILED"/,
  );
  assert.match(safeSync, /return \{ status: "failure"/);
});
