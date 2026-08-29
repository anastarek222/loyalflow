export const LOYALTY_CARD_CANVAS = {
  width: 856,
  height: 540,
} as const;

export const LOYALTY_CARD_ASPECT_RATIO =
  LOYALTY_CARD_CANVAS.width / LOYALTY_CARD_CANVAS.height;

export type LoyaltyCardZone = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

export const STANDARD_CARD_QR_ZONE: LoyaltyCardZone = {
  x: 716,
  y: 27,
  width: 112,
  height: 112,
};

export const STANDARD_CARD_QR_INSET = 10;

export const STANDARD_CARD_QR_CONTENT_ZONE: LoyaltyCardZone = {
  x: STANDARD_CARD_QR_ZONE.x + STANDARD_CARD_QR_INSET,
  y: STANDARD_CARD_QR_ZONE.y + STANDARD_CARD_QR_INSET,
  width: STANDARD_CARD_QR_ZONE.width - STANDARD_CARD_QR_INSET * 2,
  height: STANDARD_CARD_QR_ZONE.height - STANDARD_CARD_QR_INSET * 2,
};

// Custom artwork is a full-bleed background. Runtime customer data must stay
// inside these reserved zones so custom cards keep the same product geometry
// and interaction contract as standard cards.
export const CUSTOM_CARD_FRONT_QR_ZONE: LoyaltyCardZone = STANDARD_CARD_QR_ZONE;
export const CUSTOM_CARD_FRONT_QR_CONTENT_ZONE: LoyaltyCardZone =
  STANDARD_CARD_QR_CONTENT_ZONE;

export const CUSTOM_CARD_FRONT_MEMBER_ZONE: LoyaltyCardZone = {
  x: 42,
  y: 300,
  width: 313,
  height: 168,
};

export const CUSTOM_CARD_FRONT_BALANCE_ZONE: LoyaltyCardZone = {
  x: 430,
  y: 238,
  width: 378,
  height: 250,
};

export const CUSTOM_CARD_BACK_REWARD_ZONE: LoyaltyCardZone = {
  x: 42,
  y: 140,
  width: 514,
  height: 142,
};

export const CUSTOM_CARD_BACK_SCORE_ZONE: LoyaltyCardZone = {
  x: 42,
  y: 300,
  width: 514,
  height: 160,
};

export function isLoyaltyCardZoneWithinCanvas(zone: LoyaltyCardZone) {
  return (
    zone.x >= 0 &&
    zone.y >= 0 &&
    zone.width > 0 &&
    zone.height > 0 &&
    zone.x + zone.width <= LOYALTY_CARD_CANVAS.width &&
    zone.y + zone.height <= LOYALTY_CARD_CANVAS.height
  );
}

export function isLoyaltyCardZoneWithinZone(
  zone: LoyaltyCardZone,
  container: LoyaltyCardZone,
) {
  return (
    zone.x >= container.x &&
    zone.y >= container.y &&
    zone.x + zone.width <= container.x + container.width &&
    zone.y + zone.height <= container.y + container.height
  );
}
