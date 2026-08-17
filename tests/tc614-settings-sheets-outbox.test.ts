import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const action = readFileSync(
  new URL("../app/businesses/[slug]/settings/actions.ts", import.meta.url),
  "utf8",
);
const command = readFileSync(
  new URL("../lib/server/business/settings-command.ts", import.meta.url),
  "utf8",
);

test("TC6.14 Settings profile/program follow-up sync uses durable outbox transport", () => {
  const domainStart = action.indexOf("async function updateSettingsDomain");
  const profileStart = action.indexOf("export async function updateBusinessProfileAction");
  assert.ok(domainStart >= 0 && profileStart > domainStart);
  const domain = action.slice(domainStart, profileStart);

  assert.match(domain, /enqueueSheetsSync: input\.syncSheet/);
  assert.match(domain, /result\.integrationJobId/);
  assert.match(domain, /scheduleBusinessGoogleSheetsSync\(result\.integrationJobId\)/);
  assert.doesNotMatch(domain, /syncBusinessToGoogleSheetSafely/);
});

test("TC6.14 Settings command atomically stores the optional durable job", () => {
  assert.match(command, /prisma\.\$transaction/);
  assert.match(command, /transaction\.business\.update/);
  assert.match(command, /transaction\.businessActivity\.create/);
  assert.match(command, /enqueueIntegrationJob\(transaction/);
  assert.match(command, /business-settings:\$\{activity\.id\}/);
});

test("TC6.14 keeps explicit manual Sheets sync separate from automatic settings follow-up", () => {
  const manualStart = action.indexOf("export async function syncGoogleSheetAction");
  const nextStart = action.indexOf("export async function updateBusinessCardDetailsAction", manualStart);
  assert.ok(manualStart >= 0 && nextStart > manualStart);
  const manual = action.slice(manualStart, nextStart);

  assert.match(manual, /syncBusinessToGoogleSheetSafely\(business\.id\)/);
});
