import assert from "node:assert/strict";
import test from "node:test";

import {
  WHATSAPP_AUTOMATION_EVENTS,
  isWhatsAppAutomationEvent,
  isWhatsAppAutomationEventEnabled,
  isWhatsAppAutomationEventSelected,
  type BusinessWhatsAppAutomationControls,
} from "../lib/server/integrations/whatsapp-automation-policy";

const allSelected: BusinessWhatsAppAutomationControls = {
  paused: false,
  welcomeEnabled: true,
  balanceUpdatedEnabled: true,
  rewardReadyEnabled: true,
  rewardRedeemedEnabled: true,
  newRewardEnabled: true,
  newOfferEnabled: true,
};

test("WhatsApp automation policy recognizes exactly the six master-plan events", () => {
  assert.deepEqual(WHATSAPP_AUTOMATION_EVENTS, [
    "WELCOME",
    "BALANCE_UPDATED",
    "REWARD_READY",
    "REWARD_REDEEMED",
    "NEW_REWARD",
    "NEW_OFFER",
  ]);
  for (const event of WHATSAPP_AUTOMATION_EVENTS) {
    assert.equal(isWhatsAppAutomationEvent(event), true);
  }
  assert.equal(isWhatsAppAutomationEvent("UNKNOWN"), false);
  assert.equal(isWhatsAppAutomationEvent(null), false);
});

test("each event switch is independent", () => {
  const cases = [
    ["WELCOME", "welcomeEnabled"],
    ["BALANCE_UPDATED", "balanceUpdatedEnabled"],
    ["REWARD_READY", "rewardReadyEnabled"],
    ["REWARD_REDEEMED", "rewardRedeemedEnabled"],
    ["NEW_REWARD", "newRewardEnabled"],
    ["NEW_OFFER", "newOfferEnabled"],
  ] as const;

  for (const [event, key] of cases) {
    const controls = { ...allSelected, [key]: false };
    assert.equal(isWhatsAppAutomationEventSelected(controls, event), false);
    assert.equal(isWhatsAppAutomationEventEnabled(controls, event), false);

    for (const other of WHATSAPP_AUTOMATION_EVENTS) {
      if (other === event) continue;
      assert.equal(
        isWhatsAppAutomationEventSelected(controls, other),
        true,
        `${key} must not disable ${other}`,
      );
    }
  }
});

test("Global Pause blocks delivery without changing saved event selections", () => {
  const paused = { ...allSelected, paused: true };

  for (const event of WHATSAPP_AUTOMATION_EVENTS) {
    assert.equal(isWhatsAppAutomationEventSelected(paused, event), true);
    assert.equal(isWhatsAppAutomationEventEnabled(paused, event), false);
  }
});
