import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const actions = source("app/businesses/[slug]/playbooks/actions.ts");
const page = source("app/businesses/[slug]/playbooks/page.tsx");

test("TC4.18 guards playbook settings maintenance as OPERATE", () => {
  assert.match(actions, /subscriptionLifecycleState: true/);
  assert.match(actions, /canPerformSubscriptionOperation\(/);
  assert.match(actions, /canBusinessPerformSubscriptionOperation\(/);
  assert.match(actions, /"OPERATE"/);
  assert.match(actions, /error=subscription-restricted/);
  assert.ok(
    actions.indexOf("await canBusinessPerformSubscriptionOperation") <
      actions.indexOf("await transaction.business.update"),
  );
});

test("TC4.18 preserves playbook safety and post-commit sync boundaries", () => {
  assert.match(actions, /playbookMatchesBusiness/);
  assert.match(actions, /isBusinessConfiguredForPlaybook/);
  assert.match(actions, /confirmedExisting/);
  assert.doesNotMatch(actions, /transaction\.(reward|promotion|offer|campaign)\.create/);
  assert.ok(
    actions.indexOf("await prisma.$transaction") <
      actions.indexOf("await syncBusinessToGoogleSheetSafely"),
  );
});

test("TC4.18 exposes bounded bilingual restriction feedback", () => {
  assert.match(page, /query\.error === "subscription-restricted"/);
  assert.match(page, /current subscription state/);
  assert.match(page, /حالة الاشتراك الحالية/);
});
