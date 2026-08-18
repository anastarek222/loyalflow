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
