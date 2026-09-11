export const WHATSAPP_AUTOMATION_EVENTS = [
  "WELCOME",
  "BALANCE_UPDATED",
  "REWARD_READY",
  "REWARD_REDEEMED",
  "NEW_REWARD",
  "NEW_OFFER",
] as const;

export type WhatsAppAutomationEvent =
  (typeof WHATSAPP_AUTOMATION_EVENTS)[number];

export type BusinessWhatsAppAutomationControls = Readonly<{
  paused: boolean;
  welcomeEnabled: boolean;
  balanceUpdatedEnabled: boolean;
  rewardReadyEnabled: boolean;
  rewardRedeemedEnabled: boolean;
  newRewardEnabled: boolean;
  newOfferEnabled: boolean;
}>;

export function isWhatsAppAutomationEvent(
  value: unknown,
): value is WhatsAppAutomationEvent {
  return (
    typeof value === "string" &&
    WHATSAPP_AUTOMATION_EVENTS.includes(value as WhatsAppAutomationEvent)
  );
}

export function isWhatsAppAutomationEventEnabled(
  controls: BusinessWhatsAppAutomationControls,
  event: WhatsAppAutomationEvent,
) {
  if (controls.paused) return false;

  switch (event) {
    case "WELCOME":
      return controls.welcomeEnabled;
    case "BALANCE_UPDATED":
      return controls.balanceUpdatedEnabled;
    case "REWARD_READY":
      return controls.rewardReadyEnabled;
    case "REWARD_REDEEMED":
      return controls.rewardRedeemedEnabled;
    case "NEW_REWARD":
      return controls.newRewardEnabled;
    case "NEW_OFFER":
      return controls.newOfferEnabled;
  }
}
