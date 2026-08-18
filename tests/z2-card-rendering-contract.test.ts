import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  LOYALTY_CARD_ASPECT_RATIO,
  LOYALTY_CARD_CANVAS,
  STANDARD_CARD_QR_CONTENT_ZONE,
  STANDARD_CARD_QR_INSET,
  STANDARD_CARD_QR_ZONE,
  isLoyaltyCardZoneWithinCanvas,
  isLoyaltyCardZoneWithinZone,
} from "../lib/cards/card-rendering-contract";

const standardCardSource = readFileSync(
  new URL("../lib/cards/standard-card.ts", import.meta.url),
  "utf8",
);
const standardRendererSource = readFileSync(
  new URL("../components/standard-loyalty-card.tsx", import.meta.url),
  "utf8",
);
const customGeometrySource = readFileSync(
  new URL("../lib/cards/custom-card-geometry.ts", import.meta.url),
  "utf8",
);

test("Z2 keeps one canonical loyalty-card canvas and aspect ratio", () => {
  assert.deepEqual(LOYALTY_CARD_CANVAS, { width: 856, height: 540 });
  assert.equal(
    LOYALTY_CARD_ASPECT_RATIO,
    LOYALTY_CARD_CANVAS.width / LOYALTY_CARD_CANVAS.height,
  );
  assert.match(
    standardCardSource,
    /STANDARD_CARD_ASPECT_RATIO = LOYALTY_CARD_ASPECT_RATIO/,
  );
  assert.match(standardRendererSource, /LOYALTY_CARD_CANVAS/);
  assert.doesNotMatch(
    standardRendererSource,
    /export const STANDARD_CARD_CANVAS/,
  );
  assert.match(
    customGeometrySource,
    /import \{ LOYALTY_CARD_ASPECT_RATIO \} from "@\/lib\/cards\/card-rendering-contract"/,
  );
  assert.match(
    customGeometrySource,
    /Math\.abs\(ratio \/ LOYALTY_CARD_ASPECT_RATIO - 1\)/,
  );
});

test("Z2 keeps the Standard Card QR protected and content zones canonical", () => {
  assert.deepEqual(STANDARD_CARD_QR_ZONE, {
    x: 716,
    y: 27,
    width: 112,
    height: 112,
  });
  assert.equal(STANDARD_CARD_QR_ZONE.width, STANDARD_CARD_QR_ZONE.height);
  assert.equal(isLoyaltyCardZoneWithinCanvas(STANDARD_CARD_QR_ZONE), true);

  assert.deepEqual(STANDARD_CARD_QR_CONTENT_ZONE, {
    x: 726,
    y: 37,
    width: 92,
    height: 92,
  });
  assert.equal(STANDARD_CARD_QR_INSET, 10);
  assert.equal(
    isLoyaltyCardZoneWithinZone(
      STANDARD_CARD_QR_CONTENT_ZONE,
      STANDARD_CARD_QR_ZONE,
    ),
    true,
  );

  assert.match(standardRendererSource, /STANDARD_CARD_QR_ZONE\.x/);
  assert.match(standardRendererSource, /STANDARD_CARD_QR_ZONE\.y/);
  assert.match(standardRendererSource, /STANDARD_CARD_QR_ZONE\.width/);
  assert.match(standardRendererSource, /STANDARD_CARD_QR_ZONE\.height/);
  assert.match(standardRendererSource, /STANDARD_CARD_QR_CONTENT_ZONE\.x/);
  assert.match(standardRendererSource, /STANDARD_CARD_QR_CONTENT_ZONE\.y/);
  assert.match(standardRendererSource, /STANDARD_CARD_QR_CONTENT_ZONE\.width/);
  assert.match(standardRendererSource, /STANDARD_CARD_QR_CONTENT_ZONE\.height/);
});
