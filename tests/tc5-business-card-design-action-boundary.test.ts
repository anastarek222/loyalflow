import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const input = source("lib/cards/card-design-input.ts");
const action = source(
  "app/businesses/[slug]/program/card-design-actions.ts",
);
const command = source(
  "lib/server/business/business-card-design-command.ts",
);
const permissions = source("lib/cards/card-design-permissions.ts");
const legacyActions = source("app/businesses/[slug]/settings/actions.ts");
const programPage = source("app/businesses/[slug]/program/page.tsx");

test("TC5 Card design input contract preserves the existing bounded design vocabulary", () => {
  assert.match(input, /cardDesignMode: z\.enum\(\["STANDARD", "CUSTOM"\]\)/);
  assert.match(input, /primaryColor: z\.string\(\)\.regex/);
  assert.match(input, /themePreset: z\.enum\(\["DEFAULT", "DARK"\]\)/);
  for (const category of [
    "BARBER",
    "CAFE",
    "RESTAURANT",
    "FASHION",
    "BEAUTY",
    "GYM",
    "RETAIL",
    "OTHER",
  ]) {
    assert.match(input, new RegExp(`"${category}"`));
  }
  assert.match(input, /customCardSafeZoneVersion: z\.literal\("ID1_V1"\)/);
  assert.match(
    input,
    /Custom Card requires approved front artwork; Back may use the protected generated alternative/,
  );
  assert.match(input, /isValidRemoteImageUrl/);
});

test("TC5 bounded Card design action re-establishes auth tenant and lifecycle authority", () => {
  assert.match(action, /await auth\(\)/);
  assert.match(action, /prisma\.business\.findUnique/);
  assert.match(action, /canManageBusiness\(session\.user, business\.id\)/);
  assert.match(action, /canPerformSubscriptionOperation/);
  assert.match(action, /"OPERATE"/);
  assert.match(action, /parseCardDesignFormData\(formData\)/);
  assert.match(action, /getAuthorizedCardDesignUpdate/);
  assert.match(action, /imageFileToDataUrl\(logoFile, 500 \* 1024\)/);
});

test("TC5 bounded Card design action delegates persistence instead of owning a transaction", () => {
  assert.match(action, /updateBusinessCardDesignCommand\(/);
  assert.doesNotMatch(action, /prisma\.\$transaction/);
  assert.doesNotMatch(action, /transaction\.business\.update/);
  assert.doesNotMatch(action, /businessActivity\.create/);
  assert.match(command, /updateBusinessSettingsCommand/);
  assert.match(command, /enforceOperateEntitlement: true/);
});

test("TC5 Card design authorization still protects Super Admin custom artwork state", () => {
  assert.match(permissions, /role === "SUPER_ADMIN"/);
  assert.match(permissions, /currentDesignMode === "CUSTOM"/);
  assert.match(permissions, /"CUSTOM_READ_ONLY"/);
  assert.match(permissions, /submitted\.cardDesignMode === "CUSTOM"/);
  assert.match(permissions, /"CUSTOM_FORBIDDEN"/);
  assert.match(action, /CUSTOM_READ_ONLY/);
  assert.match(action, /readonly/);
  assert.match(action, /forbidden/);
});

test("TC5 Program Card design form is bound to the command-backed action", () => {
  assert.match(action, /cardDesign=invalid/);
  assert.match(action, /cardDesign=subscription-restricted/);
  assert.match(action, /cardDesign=saved/);
  assert.match(action, /revalidatePath\(`\/businesses\/\$\{business\.slug\}\/program`\)/);
  assert.match(action, /revalidatePath\("\/card\/\[token\]", "page"\)/);

  assert.match(
    programPage,
    /import \{ updateBusinessCardDesignCommandAction \} from "\.\/card-design-actions"/,
  );
  assert.match(
    programPage,
    /const updateCardDesign = updateBusinessCardDesignCommandAction\.bind/,
  );
  assert.doesNotMatch(programPage, /updateBusinessCardDesignAction,/);
  assert.match(programPage, /<form action=\{updateCardDesign\}>/);

  // Legacy compatibility remains available for later cleanup, but is not the active Program binding.
  assert.match(legacyActions, /export async function updateBusinessCardDesignAction/);
});
