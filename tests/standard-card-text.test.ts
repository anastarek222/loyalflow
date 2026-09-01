import assert from "node:assert/strict";
import test from "node:test";

import {
  STANDARD_CARD_UNIT_LABEL_MAX_LENGTH,
  boundedStandardCardUnitLabel,
  shouldStackStandardCardValue,
  standardCardDetailFontSize,
  standardCardValueFontSize,
} from "../lib/cards/standard-card-text";

test("standard-card unit labels keep professional names within a stable limit", () => {
  assert.equal(STANDARD_CARD_UNIT_LABEL_MAX_LENGTH, 18);
  assert.equal(
    boundedStandardCardUnitLabel("RECOMMENDATIONS"),
    "RECOMMENDATIONS",
  );
  assert.equal(
    boundedStandardCardUnitLabel("CUSTOMER RECOMMENDATIONS"),
    "CUSTOMER RECOMMEN…",
  );
});

test("standard-card values scale down as labels grow", () => {
  assert.equal(standardCardValueFontSize("4 PTS"), 48);
  assert.equal(standardCardValueFontSize("4 RECOMMENDATIONS"), 32);
  assert.equal(standardCardValueFontSize("4 RECOMMENDATIONS", 28), 19);
});

test("standard-card balance layout stacks long units and large amounts", () => {
  assert.equal(shouldStackStandardCardValue("4", "PTS"), false);
  assert.equal(
    shouldStackStandardCardValue("4", "RECOMMENDATIONS"),
    true,
  );
  assert.equal(shouldStackStandardCardValue("200,000", "EGP"), true);
});

test("standard-card supporting text uses bounded adaptive sizes", () => {
  assert.equal(standardCardDetailFontSize("4 / 5 PTS", 15, 11), 15);
  assert.equal(
    standardCardDetailFontSize("4 / 5 RECOMMENDATIONS", 15, 11),
    13,
  );
  assert.equal(
    standardCardDetailFontSize("1 RECOMMENDATION TO NEXT REWARD", 13, 10),
    10,
  );
});
