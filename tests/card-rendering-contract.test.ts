import assert from "node:assert/strict";
import test from "node:test";
import {
  CUSTOM_CARD_BACK_REWARD_ZONE,
  CUSTOM_CARD_BACK_SCORE_ZONE,
  CUSTOM_CARD_FRONT_BALANCE_ZONE,
  CUSTOM_CARD_FRONT_MEMBER_ZONE,
  CUSTOM_CARD_FRONT_QR_CONTENT_ZONE,
  CUSTOM_CARD_FRONT_QR_ZONE,
  STANDARD_CARD_QR_CONTENT_ZONE,
  STANDARD_CARD_QR_ZONE,
  isLoyaltyCardZoneWithinCanvas,
} from "@/lib/cards/card-rendering-contract";

test("custom card QR uses the standard card QR geometry", () => {
  assert.deepEqual(CUSTOM_CARD_FRONT_QR_ZONE, STANDARD_CARD_QR_ZONE);
  assert.deepEqual(
    CUSTOM_CARD_FRONT_QR_CONTENT_ZONE,
    STANDARD_CARD_QR_CONTENT_ZONE,
  );
});

test("all custom runtime zones stay inside the loyalty card canvas", () => {
  const zones = [
    CUSTOM_CARD_FRONT_QR_ZONE,
    CUSTOM_CARD_FRONT_QR_CONTENT_ZONE,
    CUSTOM_CARD_FRONT_MEMBER_ZONE,
    CUSTOM_CARD_FRONT_BALANCE_ZONE,
    CUSTOM_CARD_BACK_REWARD_ZONE,
    CUSTOM_CARD_BACK_SCORE_ZONE,
  ];

  for (const zone of zones) {
    assert.equal(isLoyaltyCardZoneWithinCanvas(zone), true);
  }
});
