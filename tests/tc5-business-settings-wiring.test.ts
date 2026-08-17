import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("TC5 Business Settings actions delegate authoritative writes to the server command", () => {
  const actions = source("app/businesses/[slug]/settings/actions.ts");
  const helper = actions.slice(
    actions.indexOf("async function updateSettingsDomain"),
    actions.indexOf("export async function updateBusinessProfileAction"),
  );

  assert.match(actions, /updateBusinessSettingsCommand/);
  assert.match(helper, /await updateBusinessSettingsCommand\(\{/);
  assert.doesNotMatch(helper, /prisma\.\$transaction/);
  assert.doesNotMatch(helper, /transaction\.business\.update/);
  assert.doesNotMatch(helper, /transaction\.businessActivity\.create/);
});

test("TC5/TC6 Business Settings presentation adapter preserves durable sync wake-up and revalidation responsibilities", () => {
  const actions = source("app/businesses/[slug]/settings/actions.ts");
  const helper = actions.slice(
    actions.indexOf("async function updateSettingsDomain"),
    actions.indexOf("export async function updateBusinessProfileAction"),
  );

  assert.match(helper, /syncSheet\?: boolean/);
  assert.match(helper, /enqueueSheetsSync: input\.syncSheet/);
  assert.match(helper, /result\.integrationJobId/);
  assert.match(helper, /scheduleBusinessGoogleSheetsSync\(result\.integrationJobId\)/);
  assert.doesNotMatch(helper, /syncBusinessToGoogleSheetSafely/);
  for (const expected of [
    'revalidatePath("/dashboard")',
    'revalidatePath("/businesses")',
    'revalidatePath(`/businesses/${input.slug}/settings`)',
    'revalidatePath(`/businesses/${input.slug}/program`)',
    'revalidatePath("/card/[token]", "page")',
  ]) {
    assert.ok(helper.includes(expected), `missing presentation responsibility: ${expected}`);
  }
});

test("TC5 Profile, Program, Messages and Operations keep one compatibility adapter", () => {
  const actions = source("app/businesses/[slug]/settings/actions.ts");
  const calls = actions.match(/await updateSettingsDomain\(\{/g) ?? [];

  assert.equal(calls.length, 4);
  for (const action of [
    "updateBusinessProfileAction",
    "updateProgramRulesAction",
    "updateCustomerMessagesAction",
    "updateOperationsSettingsAction",
  ]) {
    assert.match(actions, new RegExp(`export async function ${action}`));
  }
});
