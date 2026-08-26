import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import type { PublicCardProjection } from "@loyalflow/contracts/cards/public-card";
import {
  buildPublicCardProjection,
  safePublicCardColor,
} from "@/lib/cards/public-card-projection";

test("TC3.2 uses canonical unitName and normalizes one public-card projection", () => {
  const projection: PublicCardProjection = buildPublicCardProjection({
    customer: { name: " Ahmed Hassan ", code: " LF-100 ", balance: 42.9 },
    program: {
      name: " Loyal Club ",
      mode: "POINTS",
      unitName: " Stars ",
      currency: " EGP ",
      defaultLanguage: "EN",
      reward: { name: " Free drink ", cost: 50.8, type: "GIFT" },
    },
    business: {
      name: " Demo Cafe ",
      primaryColor: "#123456",
      secondaryColor: "#ABCDEF",
      themePreset: "DARK",
      city: " Cairo ",
      country: " Egypt ",
    },
    design: {
      mode: "STANDARD",
      standardArtworkEnabled: true,
      standardArtworkCategory: "cafe",
      customArtworkEnabled: false,
    },
  });

  assert.equal(projection.program.unitName, "Stars");
  assert.equal(projection.program.reward.cost, 50);
  assert.equal(projection.membership.balance, 42);
  assert.equal(projection.business.location, "Cairo, Egypt");
  assert.equal(projection.business.secondaryColor, "#ABCDEF");
  assert.equal(projection.design.standardArtwork.category, "CAFE");
});

test("TC3.2 fails closed from incomplete custom artwork and unsafe colors", () => {
  const projection = buildPublicCardProjection({
    customer: { name: "Customer", code: "LF-1", balance: -5 },
    program: {
      mode: "VISITS",
      unitName: "Visit",
      defaultLanguage: "AR",
      reward: { name: "Reward", cost: 0 },
    },
    business: {
      name: "Business",
      primaryColor: "not-a-color",
      secondaryColor: "also-not-a-color",
    },
    design: {
      mode: "CUSTOM",
      standardArtworkEnabled: true,
      customArtworkEnabled: true,
      customFrontArtworkUrl: "https://example.test/front.png",
      customBackArtworkUrl: "",
    },
  });

  assert.equal(projection.membership.balance, 0);
  assert.equal(projection.program.reward.cost, 1);
  assert.equal(projection.business.primaryColor, "#2563eb");
  assert.equal(projection.business.secondaryColor, "#FFFFFF");
  assert.equal(projection.design.customArtwork.enabled, false);
  assert.equal(safePublicCardColor("#abcdef"), "#abcdef");
});

test("TC3.2 keeps one active editor, one renderer gate, and no legacy unit writer", () => {
  const source = (path: string) =>
    readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
  const program = source("app/businesses/[slug]/program/page.tsx");
  const rules = source("components/program-rules-form.tsx");
  const wizard = source("components/business-setup-wizard.tsx");
  const publicPage = source("app/card/[token]/page.tsx");
  const publicApi = source("app/api/card/[token]/route.ts");

  assert.equal((program.match(/<StandardCardSetup/g) ?? []).length, 1);
  assert.equal((wizard.match(/<StandardCardSetup/g) ?? []).length, 1);
  assert.doesNotMatch(rules, /name="pointsName"/);
  assert.doesNotMatch(publicPage, /pointsName\?\.trim\(\)/);
  assert.match(publicPage, /buildPublicCardProjection/);
  assert.match(publicApi, /buildPublicCardProjection/);
  assert.match(publicApi, /card,/);
  assert.doesNotMatch(wizard, /LoyaltyCardPreview|cardStyleLabels|fontLabels/);
});
