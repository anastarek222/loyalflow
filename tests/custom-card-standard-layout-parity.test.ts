import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { CustomLoyaltyCard } from "../components/custom-loyalty-card";
import {
  StandardLoyaltyCard,
  type StandardLoyaltyCardProps,
} from "../components/standard-loyalty-card";

const props: StandardLoyaltyCardProps = {
  businessName: "Parity Brand",
  primaryColor: "#93C5FD",
  secondaryColor: "#E6C27A",
  themePreset: "DARK",
  customerName: "Parity Member",
  customerId: "PARITY-ID-001",
  balance: 1,
  loyaltyMode: "VISITS",
  unitName: "ORDERS",
  rewardName: "Free Reward",
  rewardThreshold: 5,
  qrCode: "data:image/png;base64,AA==",
  artworkCategory: "CAFE",
  language: "EN",
};

function renderStandard(side: "front" | "back") {
  return renderToStaticMarkup(
    createElement(StandardLoyaltyCard, { ...props, side }),
  );
}

function renderCustom(side: "front" | "back") {
  return renderToStaticMarkup(
    createElement(CustomLoyaltyCard, {
      ...props,
      side,
      customFrontArtworkUrl: "/front.png",
      customBackArtworkUrl: "/back.png",
    }),
  );
}

function extractGroup(markup: string, zone: string) {
  const marker = `data-safe-zone="${zone}"`;
  const markerIndex = markup.indexOf(marker);
  assert.notEqual(markerIndex, -1, `Missing ${zone} safe zone`);

  const groupStart = markup.lastIndexOf("<g", markerIndex);
  assert.notEqual(groupStart, -1, `Missing ${zone} group start`);

  const tokens = /<g\b[^>]*>|<\/g>/g;
  tokens.lastIndex = groupStart;
  let depth = 0;
  for (let match = tokens.exec(markup); match; match = tokens.exec(markup)) {
    if (match[0].startsWith("</g")) {
      depth -= 1;
      if (depth === 0) return markup.slice(groupStart, tokens.lastIndex);
    } else {
      depth += 1;
    }
  }

  assert.fail(`Missing ${zone} group end`);
}

function parseAttributes(source: string) {
  const attributes = new Map<string, string>();
  for (const match of source.matchAll(/([:\w-]+)="([^"]*)"/g)) {
    attributes.set(match[1], match[2]);
  }
  return attributes;
}

const parityAttributes = [
  "x",
  "y",
  "x1",
  "y1",
  "x2",
  "y2",
  "cx",
  "cy",
  "r",
  "width",
  "height",
  "rx",
  "font-size",
  "font-weight",
  "letter-spacing",
  "text-anchor",
  "direction",
  "opacity",
  "viewBox",
  "preserveAspectRatio",
  "d",
] as const;

function geometrySignature(group: string) {
  const tags = /<(rect|text|line|image|circle|svg|path)\b([^>]*)>/g;
  return Array.from(group.matchAll(tags), (match) => {
    const attributes = parseAttributes(match[2]);
    return {
      tag: match[1],
      attrs: Object.fromEntries(
        parityAttributes.flatMap((name) => {
          const value = attributes.get(name);
          return value === undefined ? [] : [[name, value]];
        }),
      ),
    };
  });
}

function assertZoneParity(
  standardMarkup: string,
  customMarkup: string,
  zone: string,
) {
  assert.deepEqual(
    geometrySignature(extractGroup(customMarkup, zone)),
    geometrySignature(extractGroup(standardMarkup, zone)),
    `${zone} geometry/typography drifted from Standard Card`,
  );
}

test("custom front uses the exact Standard QR, customer, ID, score and progress geometry", () => {
  const standard = renderStandard("front");
  const custom = renderCustom("front");

  assert.match(custom, /data-layout-authority="standard-card"/);
  for (const zone of ["qr-code", "customer-information", "loyalty-balance"]) {
    assertZoneParity(standard, custom, zone);
  }

  assert.match(custom, />Parity Member<\/text>/);
  assert.match(custom, />PARITY-ID-001<\/text>/);
});

test("custom back uses the exact Standard reward, score, progress and icon geometry", () => {
  const standard = renderStandard("back");
  const custom = renderCustom("back");

  for (const zone of ["reward", "loyalty-balance", "brand-artwork"]) {
    assertZoneParity(standard, custom, zone);
  }

  assert.match(custom, />Free Reward<\/tspan>/);
});
