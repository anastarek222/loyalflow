import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const actions = source(
  "app/businesses/[slug]/customers/[customerId]/note-actions.ts",
);
const command = source("lib/server/business/customer-note-write-command.ts");

function exportedAction(name: string, nextName?: string) {
  const start = actions.indexOf(`export async function ${name}`);
  assert.ok(start >= 0, `${name} must exist`);
  const end = nextName
    ? actions.indexOf(`export async function ${nextName}`, start)
    : actions.length;
  assert.ok(end > start);
  return actions.slice(start, end);
}

const createAction = exportedAction(
  "createCustomerNoteCommandAction",
  "updateCustomerNoteCommandAction",
);
const updateAction = exportedAction("updateCustomerNoteCommandAction");

test("TC5 bounded Customer Note actions re-establish server authority before command delegation", () => {
  assert.match(actions, /await auth\(\)/);
  assert.match(actions, /opaqueIdSchema\.safeParse/);
  assert.match(actions, /prisma\.business\.findUnique/);
  assert.match(actions, /canManageCustomerNotesTags/);
  assert.match(actions, /businessId: business\.id/);
  assert.match(actions, /prisma\.customer\.findFirst/);
  assert.match(actions, /subscriptionLifecycleState: true/);
  assert.doesNotMatch(actions, /prisma\.\$transaction/);
  assert.doesNotMatch(actions, /transaction\.customerNote/);
});

test("TC5 create Customer Note action keeps parsing, preflight and presentation while delegating persistence", () => {
  assert.match(createAction, /customerNoteContentSchema\.safeParse/);
  assert.match(createAction, /canPerformSubscriptionOperation/);
  assert.match(createAction, /createCustomerNoteCommand\(/);
  assert.match(createAction, /actorId: session\.user\.id/);
  assert.match(createAction, /SUBSCRIPTION_RESTRICTED/);
  assert.match(createAction, /success=note-created/);
});

test("TC5 update Customer Note action validates note identity and delegates authoritative ownership checks", () => {
  assert.match(updateAction, /opaqueIdSchema\.safeParse\(noteId\)/);
  assert.match(updateAction, /customerNoteContentSchema\.safeParse/);
  assert.match(updateAction, /canPerformSubscriptionOperation/);
  assert.match(updateAction, /updateCustomerNoteCommand\(/);
  assert.match(updateAction, /noteId: parsedNoteId\.data/);
  assert.match(updateAction, /TARGET_NOT_FOUND|result\.reason/);
  assert.match(updateAction, /success=note-updated/);
});

test("TC5 Customer Note command remains the sole atomic persisted authority for the bounded actions", () => {
  assert.match(command, /prisma\.\$transaction/);
  assert.match(command, /canBusinessPerformSubscriptionOperation/);
  assert.match(command, /transaction\.customerNote\.create/);
  assert.match(command, /transaction\.customerNote\.update/);
  assert.match(command, /transaction\.businessActivity\.create/);
});
