import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const actions = source("app/businesses/[slug]/offers/actions.ts");
const command = source("lib/server/business/offer-write-command.ts");

test("TC5 Offer actions keep presentation preflight and delegate persisted writes", () => {
  assert.match(actions, /canPerformSubscriptionOperation/);
  assert.match(actions, /hasFeatureEntitlement/);
  assert.match(actions, /isWithinPlanLimit/);
  assert.match(actions, /createOfferCommand/);
  assert.match(actions, /updateOfferCommand/);
  assert.match(actions, /setOfferStatusCommand/);
  assert.doesNotMatch(actions, /prisma\.\$transaction/);
  assert.doesNotMatch(actions, /transaction\.offer\.(create|update)/);
  assert.doesNotMatch(actions, /businessActivity\.create/);
});

test("TC5 Offer creation rechecks persisted lifecycle, plan feature and limit before write", () => {
  const entitlement = command.indexOf("await canBusinessPerformSubscriptionOperation");
  const businessRead = command.indexOf("transaction.business.findUnique");
  const feature = command.indexOf("hasFeatureEntitlement");
  const limit = command.indexOf("isWithinPlanLimit");
  const create = command.indexOf("transaction.offer.create");

  for (const position of [entitlement, businessRead, feature, limit, create]) {
    assert.ok(position >= 0);
  }
  assert.ok(entitlement < businessRead);
  assert.ok(businessRead < feature);
  assert.ok(feature < create);
  assert.ok(limit < create);
  assert.match(command, /transaction\.planConfiguration\.findUnique/);
  assert.match(command, /transaction\.offer\.count/);
  assert.match(command, /"PLAN_FEATURE"/);
  assert.match(command, /"PLAN_LIMIT"/);
});

test("TC5 Offer update and status writes preserve tenant ownership inside the transaction", () => {
  const updateStart = command.indexOf("export async function updateOfferCommand");
  const statusStart = command.indexOf("export async function setOfferStatusCommand");
  assert.ok(updateStart >= 0 && statusStart > updateStart);

  for (const slice of [
    command.slice(updateStart, statusStart),
    command.slice(statusStart),
  ]) {
    assert.match(slice, /canBusinessPerformSubscriptionOperation/);
    assert.match(slice, /"OPERATE"/);
    assert.match(
      slice,
      /where: \{ id: input\.offerId, businessId: input\.businessId \}/,
    );
    assert.match(slice, /"TARGET_NOT_FOUND"/);
    assert.ok(
      slice.indexOf("transaction.offer.findFirst") <
        slice.indexOf("transaction.offer.update"),
    );
  }
});

test("TC5 Offer commands keep the domain write and audit atomic", () => {
  assert.match(command, /prisma\.\$transaction/);
  assert.match(command, /type: "OFFER_CREATED"/);
  assert.match(command, /type: "OFFER_UPDATED"/);
  assert.match(command, /type: "OFFER_STATUS_CHANGED"/);
  assert.match(command, /transaction\.businessActivity\.create/);
  assert.doesNotMatch(command, /stripe|checkout|webhook|process\.env/i);
});
