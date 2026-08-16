import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { StandardLoyaltyCard } from "@/components/standard-loyalty-card";
import {
  CARD_DESIGN_MODES,
  STANDARD_CARD_ARTWORK_CATEGORIES,
  STANDARD_CARD_ASPECT_RATIO,
  getLoyaltyCardMetrics,
  getLoyaltyCardPreviewData,
  getPreviewBalance,
  compactLoyaltyUnit,
  standardCardArtworkCategory,
  standardCardTheme,
} from "@/lib/cards/standard-card";

const root = process.cwd();
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("standard card keeps the ISO bank-card aspect ratio contract", () => {
  assert.ok(Math.abs(STANDARD_CARD_ASPECT_RATIO - 1.586) < 0.002);
  assert.match(source("components/standard-loyalty-card.tsx"), /data-card-aspect-ratio="1\.586"/);
});

test("standard card uses one browser-independent SVG canvas", () => {
  const card = source("components/standard-loyalty-card.tsx");
  assert.match(card, /STANDARD_CARD_CANVAS = \{ width: 856, height: 540 \}/);
  assert.match(card, /viewBox=\{`0 0 \$\{STANDARD_CARD_CANVAS\.width\} \$\{STANDARD_CARD_CANVAS\.height\}`\}/);
  assert.match(card, /preserveAspectRatio="xMidYMid meet"/);
  assert.doesNotMatch(card, /ResizeObserver|transform:|cqw|cqh|cqi|cqb|containerType/);
});

test("standard SVG isolates its fixed canvas from an RTL page", () => {
  const card = source("components/standard-loyalty-card.tsx");
  assert.match(card, /<svg[\s\S]*?direction="ltr"[\s\S]*?unicodeBidi: "isolate"/);
  assert.match(
    card,
    /data-safe-zone="brand-logo"[\s\S]*?direction="ltr"[\s\S]*?unicodeBidi: "isolate"/,
  );
});

test("standard QR has fixed logical dimensions and defensive bounds", () => {
  const card = source("components/standard-loyalty-card.tsx");
  assert.match(card, /data-safe-zone="qr-code"/);
  assert.match(card, /x="716"\s+y="27"\s+width="112"\s+height="112"/);
  assert.match(card, /x="726"\s+y="37"\s+width="92"\s+height="92"/);
  assert.match(card, /preserveAspectRatio="xMidYMid meet"/);
});

test("protected Standard Front keeps its approved structural coordinates", () => {
  const card = source("components/standard-loyalty-card.tsx");
  assert.match(card, /x="430"\s+y="238"\s+width="378"\s+height="250"/);
  assert.match(card, /x=\{rtl \? 355 : 42\}\s+y="215"/);
  assert.match(card, /x=\{rtl \? 355 : 42\}\s+y="327"/);
  assert.match(card, /x="716"\s+y="27"\s+width="112"\s+height="112"/);
});

test("standard decoration has a bounded non-repeating texture", () => {
  const card = source("components/standard-loyalty-card.tsx");
  assert.match(card, /data-safe-zone="card-background"/);
  assert.doesNotMatch(card, /repeating-linear-gradient|backgroundSize/);
  assert.match(card, /opacity="0\.035"/);
});

test("standard card exposes fixed, component-controlled safe zones", () => {
  const card = source("components/standard-loyalty-card.tsx");
  for (const zone of ["brand-logo", "customer-information", "qr-code", "loyalty-balance", "progress", "reward", "brand-artwork"]) assert.match(card, new RegExp(`data-safe-zone="${zone}"`));
});

test("standard owner setup has no arbitrary layout, background, font, or owner artwork controls", () => {
  const setup = source("components/standard-card-setup.tsx");
  assert.doesNotMatch(setup, /backgroundUrl|fontFamily|drag/i);
  assert.match(setup, /LoyaltyCard/);
  assert.match(setup, /standardCardArtworkCategory/);
  assert.match(setup, /allowCustom/);
  assert.match(setup, /Super Admin only/);
});

test("light and dark themes use the controlled mapping", () => {
  assert.equal(standardCardTheme("DEFAULT"), "light");
  assert.equal(standardCardTheme("DARK"), "dark");
  assert.equal(standardCardTheme("GRADIENT"), "light");
});

test("category artwork is allow-listed with a safe fallback", () => {
  assert.deepEqual(STANDARD_CARD_ARTWORK_CATEGORIES, ["BARBER", "CAFE", "RESTAURANT", "FASHION", "BEAUTY", "GYM", "RETAIL", "OTHER"]);
  assert.equal(standardCardArtworkCategory("cafe"), "CAFE");
  assert.equal(standardCardArtworkCategory("https://untrusted.example/art.png"), "OTHER");
});

test("all loyalty modes have supported preview values", () => {
  const card = source("components/standard-loyalty-card.tsx");
  const metrics = source("lib/cards/standard-card.ts");
  for (const mode of ["POINTS", "VISITS", "SALES_AMOUNT"]) assert.match(metrics, new RegExp(`"${mode}"`));
  assert.match(card, /getLoyaltyCardMetrics/);
  assert.match(metrics, /REWARD READY/);
  assert.match(metrics, /TO NEXT REWARD/);
});

test("loyalty mode semantics format visits, points, sales and reward-ready states", () => {
  assert.equal(getLoyaltyCardMetrics({ balance: 7, loyaltyMode: "VISITS", rewardThreshold: 10, language: "EN" }).remainingText, "3 VISITS TO NEXT REWARD");
  assert.equal(getLoyaltyCardMetrics({ balance: 4, loyaltyMode: "VISITS", rewardThreshold: 5, language: "EN" }).remainingText, "1 VISIT TO NEXT REWARD");
  assert.equal(getLoyaltyCardMetrics({ balance: 850, loyaltyMode: "POINTS", unitName: "PTS", rewardThreshold: 1000, language: "EN" }).ratioText, "850 / 1,000 PTS");
  assert.equal(getLoyaltyCardMetrics({ balance: 1850, loyaltyMode: "SALES_AMOUNT", currency: "EGP", rewardThreshold: 2500, language: "EN" }).remainingText, "EGP 650 TO NEXT REWARD");
  assert.equal(getLoyaltyCardMetrics({ balance: 10, loyaltyMode: "VISITS", rewardThreshold: 10, language: "EN" }).rewardReady, true);
  assert.equal(getPreviewBalance("VISITS", 5), 3);
  assert.equal(getPreviewBalance("POINTS", 1000), 500);
  assert.equal(getPreviewBalance("SALES_AMOUNT", 2500), 1250);
});

test("unit, target and reward remain distinct in English and Arabic", () => {
  const recommendations = getLoyaltyCardMetrics({
    balance: 4,
    loyaltyMode: "POINTS",
    unitName: "Recommendation",
    rewardThreshold: 5,
    language: "EN",
  });
  assert.equal(recommendations.currentText, "4 RECS");
  assert.equal(recommendations.ratioText, "4 / 5 RECS");
  assert.equal(recommendations.remainingText, "1 REC TO NEXT REWARD");

  const arabic = getLoyaltyCardMetrics({
    balance: 4,
    loyaltyMode: "VISITS",
    unitName: "زيارة",
    rewardThreshold: 5,
    language: "AR",
  });
  assert.equal(arabic.currentText, "٤ زيارات");
  assert.equal(arabic.ratioText, "٤ / ٥ زيارات");
  assert.equal(arabic.remainingText, "زيارة واحدة حتى المكافأة");
  assert.doesNotMatch(arabic.currentText, /هدية مجانية/);
});

test("builder preview identity and balances are explicit and deterministic", () => {
  assert.deepEqual(getLoyaltyCardPreviewData("POINTS", 1000), {
    customerName: "Sample Customer",
    customerId: "PREVIEW-001",
    balance: 500,
  });
  assert.equal(getLoyaltyCardPreviewData("POINTS", 5).balance, 3);
  const renderer = source("components/standard-loyalty-card.tsx");
  assert.doesNotMatch(renderer, /Sample Customer|PREVIEW-001|Ahmed Mohamed Hassan|LF-001234/);
});

test("editor QR is deterministic while public cards can supply the real token QR", () => {
  const card = source("components/standard-loyalty-card.tsx");
  assert.match(card, /function PreviewQr/);
  assert.match(card, /props\.qrCode/);
  assert.match(source("app/card/[token]/page.tsx"), /qrCode=\{qrCode\}/);
});

test("category motifs are controlled SVG artwork rather than owner supplied artwork", () => {
  const card = source("components/standard-loyalty-card.tsx");
  assert.match(card, /function Artwork/);
  assert.match(card, /BARBER|CAFE|RESTAURANT/);
  assert.doesNotMatch(card, /artworkUrl|backgroundUrl/);
});

test("long customer and business names are constrained within the card", () => {
  const card = source("components/standard-loyalty-card.tsx");
  assert.match(card, /boundedText/);
  assert.match(card, /valueFontSize/);
});

test("long units retain semantic meaning while using bounded display labels", () => {
  assert.equal(compactLoyaltyUnit("POINT"), "POINT");
  assert.equal(compactLoyaltyUnit("POINTS"), "POINTS");
  assert.equal(compactLoyaltyUnit("RECOMMENDATION"), "RECS");
  assert.equal(compactLoyaltyUnit("RECOMMENDATION", 1), "REC");
  assert.equal(compactLoyaltyUnit("RECOMMENDATIONS"), "RECS");
  assert.equal(compactLoyaltyUnit("PURCHASE"), "PURCHASE");
  assert.equal(compactLoyaltyUnit("MEMBERSHIP CREDIT"), "CREDITS");

  const metrics = getLoyaltyCardMetrics({
    balance: 850,
    loyaltyMode: "POINTS",
    unitName: "RECOMMENDATIONS",
    rewardThreshold: 1000,
    language: "EN",
  });
  assert.equal(metrics.currentText, "850 RECS");
  assert.equal(metrics.ratioText, "850 / 1,000 RECS");
  assert.equal(metrics.semanticCurrentText, "850 RECOMMENDATIONS");
});

test("card contacts are conditional and website display is human readable", () => {
  const card = source("components/standard-loyalty-card.tsx");
  assert.match(card, /formatWebsiteForCard/);
  assert.match(card, /contactText \?/);
  assert.match(card, /Business contact information/);
  for (const field of ["businessPhone", "businessWebsite", "businessLocation"]) {
    assert.match(card, new RegExp(field));
  }
  assert.doesNotMatch(card, /Phone \\| Website \\| Location/);
});

test("Back hides unavailable contacts and renders only supplied phone website and location", () => {
  const base = {
    side: "back" as const,
    businessName: "XTVCO",
    primaryColor: "#B98A4B",
    customerName: "Ahmed Mohamed Hassan",
    customerId: "LF-001234",
    balance: 850,
    loyaltyMode: "POINTS" as const,
    unitName: "Recommendation",
    rewardName: "20% Discount On Your Next Purchase",
    rewardThreshold: 1000,
  };
  const withoutContacts = renderToStaticMarkup(
    React.createElement(StandardLoyaltyCard, base),
  );
  const withContacts = renderToStaticMarkup(
    React.createElement(StandardLoyaltyCard, {
      ...base,
      businessPhone: "010 1234 5678",
      businessWebsite: "https://www.xtvco.com/",
      businessLocation: "Cairo, Egypt",
    }),
  );

  assert.doesNotMatch(withoutContacts, /Business contact information/);
  assert.match(withContacts, /Business contact information/);
  assert.match(withContacts, /010 1234 5678/);
  assert.match(withContacts, /xtvco\.com/);
  assert.match(withContacts, /Cairo, Egypt/);
  assert.doesNotMatch(withContacts, /https:\/\/|www\./);
});

test("Back safely renders long and Arabic reward states with intentional RTL", () => {
  const longBack = renderToStaticMarkup(React.createElement(StandardLoyaltyCard, {
    side: "back",
    businessName: "A Very Long Business Company Name Example",
    primaryColor: "#2563EB",
    customerName: "Ahmed Mohamed Hassan",
    customerId: "LF-001234",
    balance: 4,
    loyaltyMode: "POINTS",
    unitName: "Recommendation",
    rewardName: "Free 12 months subscription",
    rewardThreshold: 5,
  }));
  assert.match(longBack, /Free 12 months subscription/);
  assert.match(longBack, /4 \/ 5 RECS/);
  assert.match(longBack, /1 REC TO NEXT REWARD/);
  assert.match(longBack, /<tspan/);

  const arabicBack = renderToStaticMarkup(React.createElement(StandardLoyaltyCard, {
    side: "back",
    businessName: "XTV",
    primaryColor: "#2563EB",
    customerName: "أحمد محمد حسن عبدالله",
    customerId: "LF-001234",
    balance: 5,
    loyaltyMode: "VISITS",
    unitName: "زيارة",
    rewardName: "هدية مجانية لمدة سنة كاملة",
    rewardThreshold: 5,
    language: "AR",
  }));
  assert.match(arabicBack, /direction="rtl"/);
  assert.match(arabicBack, /هدية مجانية لمدة سنة كاملة/);
  assert.match(arabicBack, /المكافأة جاهزة/);
  assert.match(arabicBack, /text-anchor="end"/);
});

test("customer and reward safe zones clamp realistic long values", () => {
  const card = source("components/standard-loyalty-card.tsx");
  assert.match(card, /boundedText\(props\.customerName, 30\)/);
  assert.match(card, /props\.rewardName \|\|\s+rewardName/);
  assert.match(card, /overflow-hidden/);
});

test("front reserves a large deterministic balance panel", () => {
  const card = source("components/standard-loyalty-card.tsx");
  assert.match(card, /x="430"\s+y="238"\s+width="378"\s+height="250"/);
  assert.match(card, /data-safe-zone="loyalty-balance"/);
  assert.match(card, /data-safe-zone="progress"/);
});

test("Back keeps artwork secondary and fills RTL progress deliberately from the right", () => {
  const card = source("components/standard-loyalty-card.tsx");
  assert.match(card, /data-visual-priority="secondary"/);
  assert.match(card, /backProgressFillX = rtl/);
  assert.match(card, /backProgressX \+ 514 - backProgressWidth/);
  assert.match(card, /opacity="0\.38"/);
  assert.match(card, /contactText \? "524" : "507"/);
});

test("Loyalty summary keeps Mode, Unit, Target and Reward distinct with pluralized target", () => {
  const setup = source("components/standard-card-setup.tsx");
  for (const label of ["Mode", "Unit", "Target", "Reward"]) {
    assert.match(setup, new RegExp(`>${label}<`));
  }
  assert.match(setup, /summaryMetrics\.targetText/);
  assert.doesNotMatch(setup, /values\.rewardThreshold\.toLocaleString\(\)\} \{values\.unitName/);
  assert.equal(getLoyaltyCardMetrics({
    balance: 0,
    loyaltyMode: "POINTS",
    unitName: "Visit",
    rewardThreshold: 4,
    language: "EN",
  }).targetText, "4 VISITS");
  assert.equal(getLoyaltyCardMetrics({
    balance: 0,
    loyaltyMode: "VISITS",
    unitName: "زيارة",
    rewardThreshold: 5,
    language: "AR",
  }).targetText, "٥ زيارات");
});

test("custom artwork capability stays reserved for super-admin architecture", () => {
  const schema = source("prisma/schema.prisma");
  const owner = source("components/owner-onboarding-wizard.tsx");
  const settingsAction = source("app/businesses/[slug]/settings/actions.ts");
  const canonical = source("components/loyalty-card.tsx");
  assert.deepEqual(CARD_DESIGN_MODES, ["STANDARD", "CUSTOM"]);
  assert.match(schema, /customCardArtworkEnabled\s+Boolean/);
  assert.doesNotMatch(owner, /customCardArtworkEnabled/);
  assert.match(settingsAction, /session\.user\.role !== "SUPER_ADMIN"/);
  assert.match(canonical, /data-safe-zone-version/);
  assert.match(canonical, /custom-qr|custom-member|custom-balance|custom-reward/);
});

test("Custom UX delegates lifecycle uploads while preserving published URLs", () => {
  const setup = source("components/standard-card-setup.tsx");
  const manager = source("components/custom-card-artwork-manager.tsx");
  const canonical = source("components/loyalty-card.tsx");
  assert.match(setup, /Upload, immutable draft versions, preview and publish/);
  assert.match(manager, /Upload new draft version/);
  assert.match(manager, /Publish this version/);
  assert.match(manager, /Vercel Blob is not connected/);
  assert.doesNotMatch(setup, /type="url"|Custom front artwork URL|Custom back artwork URL/);
  assert.match(setup, /name="customCardFrontArtworkUrl"\s+type="hidden"/);
  assert.match(setup, /name="customCardBackArtworkUrl"\s+type="hidden"/);
  assert.match(canonical, /props\.customFrontArtworkUrl/);
  assert.match(canonical, /props\.customBackArtworkUrl/);
  assert.match(canonical, /Boolean\(props\.customFrontArtworkUrl && props\.customBackArtworkUrl\)/);
  assert.doesNotMatch(setup, /Upload Front Design|Upload Back Design|Remove existing artwork/);
  assert.match(setup, /Managed from the Custom Card artwork panel above/);
  assert.match(manager, /object-contain/);
});

test("custom artwork keeps dynamic data readable over dark artwork", () => {
  const canonical = source("components/loyalty-card.tsx");
  assert.match(canonical, /function readableAccentOnDark/);
  for (const zone of [
    "custom-brand",
    "custom-member",
    "custom-back-brand",
    "custom-reward",
  ]) {
    assert.match(canonical, new RegExp(`data-safe-zone="${zone}"[^>]*bg-black\\/60`));
  }
});

test("public card is rendered from dynamic customer and business data", () => {
  const page = source("app/card/[token]/page.tsx");
  assert.match(page, /LoyaltyCard/);
  for (const value of ["customerName", "customer\.customerCode", "customer\.balance", "business\.logoUrl", "business\.standardCardArtworkCategory", "business\.cardDesignMode"]) assert.match(page, new RegExp(value));
});

test("all Standard Card previews and the public card retain the canonical renderer", () => {
  const preview = source("components/loyalty-card-preview.tsx");
  const setup = source("components/standard-card-setup.tsx");
  const wizard = source("components/business-setup-wizard.tsx");
  const publicCard = source("app/card/[token]/page.tsx");
  for (const renderer of [preview, setup, publicCard]) assert.match(renderer, /LoyaltyCard/);
  assert.match(wizard, /StandardCardSetup/);
  assert.match(source("components/loyalty-card.tsx"), /StandardLoyaltyCard/);
});