import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  LOYALTY_CARD_ASPECT_RATIO,
  LOYALTY_CARD_CANVAS,
  STANDARD_CARD_QR_ZONE,
  isLoyaltyCardZoneWithinCanvas,
} from "../lib/cards/card-rendering-contract";

const standardCardSource = readFileSync(
  new URL("../lib/cards/standard-card.ts", import.meta.url),
  "utf8",
);
const standardRendererSource = readFileSync(
  new URL("../components/standard-loyalty-card.tsx", import.meta.url),
  "utf8",
);

function exactAttribute(name: string, value: number) {
  return new RegExp(`${name}="${value}"`);
}

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
  assert.match(
    standardRendererSource,
    /STANDARD_CARD_CANVAS = \{ width: 856, height: 540 \} as const/,
  );
});

test("Z2 keeps the Standard Card QR protected zone square and inside the canvas", () => {
  assert.deepEqual(STANDARD_CARD_QR_ZONE, {
    x: 716,
    y: 27,
    width: 112,
    height: 112,
  });
  assert.equal(STANDARD_CARD_QR_ZONE.width, STANDARD_CARD_QR_ZONE.height);
  assert.equal(isLoyaltyCardZoneWithinCanvas(STANDARD_CARD_QR_ZONE), true);

  assert.match(standardRendererSource, exactAttribute("x", STANDARD_CARD_QR_ZONE.x));
  assert.match(standardRendererSource, exactAttribute("y", STANDARD_CARD_QR_ZONE.y));
  assert.match(
    standardRendererSource,
    exactAttribute("width", STANDARD_CARD_QR_ZONE.width),
  );
  assert.match(
    standardRendererSource,
    exactAttribute("height", STANDARD_CARD_QR_ZONE.height),
  );
});
