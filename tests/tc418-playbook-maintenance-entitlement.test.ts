import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const actions = source("app/businesses/[slug]/playbooks/actions.ts");
const command = source("lib/server/business/playbook-application-command.ts");
const page = source("app/businesses/[slug]/playbooks/page.tsx");

test("TC4.18 guards playbook settings maintenance as OPERATE", () => {
  assert.match(actions, /subscriptionLifecycleState: true/);
  assert.match(actions, /canPerformSubscriptionOperation\(/);
  assert.match(actions, /"OPERATE"/);
  assert.match(actions, /error=subscription-restricted/);
  assert.match(actions, /applyBusinessPlaybookCommand\(/);

  assert.match(command, /canBusinessPerformSubscriptionOperation\(/);
  assert.match(command, /"OPERATE"/);
  assert.ok(
    command.indexOf("await canBusinessPerformSubscriptionOperation") <
      command.indexOf("await transaction.business.update"),
  );
});

test("TC4.18 preserves playbook safety and post-commit sync boundaries", () => {
  assert.match(command, /playbookMatchesBusiness/);
  assert.match(command, /isBusinessConfiguredForPlaybook/);
  assert.match(command, /confirmedExisting/);
  assert.doesNotMatch(command, /transaction\.(reward|promotion|offer|campaign)\.create/);
  assert.doesNotMatch(actions, /prisma\.\$transaction/);
  assert.match(command, /enqueueIntegrationJob\(transaction/);
  assert.match(actions, /scheduleBusinessGoogleSheetsSync\(outcome\.integrationJobId\)/);
  assert.doesNotMatch(actions, /syncBusinessToGoogleSheetSafely/);
  assert.ok(
    actions.indexOf("await applyBusinessPlaybookCommand") <
      actions.indexOf("scheduleBusinessGoogleSheetsSync"),
  );
});

test("TC4.18 exposes bounded bilingual restriction feedback", () => {
  assert.match(page, /query\.error === "subscription-restricted"/);
  assert.match(page, /current subscription state/);
  assert.match(page, /حالة الاشتراك الحالية/);
});
