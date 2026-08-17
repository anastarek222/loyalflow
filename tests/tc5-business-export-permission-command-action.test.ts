import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const action = source(
  "app/businesses/[slug]/settings/export-permission-action.ts",
);
const command = source(
  "lib/server/business/business-export-permission-command.ts",
);
const sharedSettingsCommand = source("lib/server/business/settings-command.ts");
const settingsPage = source("app/businesses/[slug]/settings/page.tsx");

test("TC5 bounded export action re-establishes SUPER_ADMIN and business authority", () => {
  assert.match(action, /await auth\(\)/);
  assert.match(action, /session\.user\.role !== "SUPER_ADMIN"/);
  assert.match(action, /prisma\.business\.findUnique/);
  assert.match(action, /allowOwnerDataExport: true/);
  assert.match(action, /subscriptionLifecycleState: true/);
});

test("TC5 bounded export action preserves no-op replay before OPERATE preflight", () => {
  const noOp = action.indexOf(
    "allowOwnerDataExport === business.allowOwnerDataExport",
  );
  const preflight = action.indexOf("!canPerformSubscriptionOperation(");
  const commandCall = action.indexOf(
    "await updateBusinessExportPermissionCommand({",
  );
  assert.ok(noOp >= 0 && preflight > noOp && commandCall > preflight);
  assert.match(action, /"OPERATE"/);
});

test("TC5 bounded export action delegates changed persistence and owns no transaction", () => {
  assert.match(action, /updateBusinessExportPermissionCommand\(/);
  assert.match(action, /businessId: business\.id/);
  assert.match(action, /actor: session\.user/);
  assert.match(action, /allowOwnerDataExport/);
  assert.doesNotMatch(action, /prisma\.\$transaction/);
  assert.doesNotMatch(action, /transaction\.business\.update/);
  assert.match(command, /updateBusinessSettingsCommand/);
  assert.match(sharedSettingsCommand, /prisma\.\$transaction/);
  assert.match(sharedSettingsCommand, /transaction\.business\.update/);
});

test("TC5 bounded export action preserves existing success and restriction destinations", () => {
  assert.match(action, /exportPermissionSaved=1/);
  assert.match(action, /exportPermissionSaved=subscription-restricted/);
  assert.match(action, /revalidatePath\(`\/businesses\/\$\{business\.slug\}\/reports`\)/);
  assert.match(action, /revalidatePath\(`\/businesses\/\$\{business\.slug\}\/activity`\)/);
});

test("TC5 Settings export form is bound to the command-backed action", () => {
  assert.match(
    settingsPage,
    /import \{ updateBusinessExportPermissionCommandAction \} from "\.\/export-permission-action"/,
  );
  assert.match(
    settingsPage,
    /action=\{updateBusinessExportPermissionCommandAction\.bind\(/,
  );
  assert.doesNotMatch(
    settingsPage,
    /updateBusinessExportPermissionAction,/,
  );
});
