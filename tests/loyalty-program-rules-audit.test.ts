import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getLoyaltyProgramRulesAuditMetadata,
  type LoyaltyProgramRulesSnapshot,
} from "@/lib/loyalty/program-rules-audit";

const before: LoyaltyProgramRulesSnapshot = {
  loyaltyProgramName: "Coffee Club",
  pointsName: "Points",
  welcomeMessage: "Welcome",
  cardDefaultLanguage: "EN",
  loyaltyMode: "VISITS",
  unitName: "Visit",
  rewardName: "Free coffee",
  rewardType: "GIFT",
  rewardCode: null,
  rewardDescription: null,
  rewardThreshold: 5,
  earnAmount: 1,
};

test("records stable before and after programme-rule snapshots", () => {
  const after: LoyaltyProgramRulesSnapshot = {
    ...before,
    rewardName: "Free premium coffee",
    rewardThreshold: 8,
  };

  const metadata = getLoyaltyProgramRulesAuditMetadata(before, after);

  assert.equal(metadata.domain, "LOYALTY_PROGRAM_RULES");
  assert.deepEqual(metadata.changedFields, [
    "rewardName",
    "rewardThreshold",
  ]);
  assert.deepEqual(metadata.before, before);
  assert.deepEqual(metadata.after, after);
});

test("records an empty changed-field list for an unchanged submission", () => {
  const metadata = getLoyaltyProgramRulesAuditMetadata(before, {
    ...before,
  });

  assert.deepEqual(metadata.changedFields, []);
});

test("programme updates persist audit metadata without replacing actor metadata", () => {
  const actions = readFileSync(
    new URL("../app/businesses/[slug]/settings/actions.ts", import.meta.url),
    "utf8",
  );

  assert.match(actions, /metadata\?: Prisma\.InputJsonObject/);
  assert.match(actions, /actorMetadata/);
  assert.match(actions, /\.\.\.\(actorMetadata \?\? \{\}\)/);
  assert.match(actions, /\.\.\.\(input\.metadata \?\? \{\}\)/);
  assert.match(actions, /getLoyaltyProgramRulesAuditMetadata/);
  assert.match(
    actions,
    /getLoyaltyProgramRulesAuditMetadata\(\s*currentProgrammeSnapshot,\s*nextProgramme,?\s*\)/,
  );
});
