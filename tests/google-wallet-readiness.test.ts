import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGoogleWalletPassReady,
  getGoogleWalletFeatureState,
  getGoogleWalletSyncDecision,
  type GoogleWalletPassSource,
} from "../lib/google-wallet/readiness";

function source(overrides: Partial<GoogleWalletPassSource> = {}): GoogleWalletPassSource {
  return {
    business: {
      id: "business-a", name: "Coffee House", logoUrl: "https://cdn.example.test/logo.png",
      primaryColor: "#123456", secondaryColor: "#ffffff", loyaltyMode: "VISITS",
      unitName: "visits", rewardName: "Free coffee", rewardThreshold: 5, isActive: true,
    },
    customer: {
      id: "customer-a", businessId: "business-a", firstName: "Ada", lastName: "Lovelace",
      customerCode: "COF-001", balance: 4, isActive: true, publicToken: "opaque-public-token",
    },
    publicCardUrl: "https://app.example.test/card/opaque-public-token",
    ...overrides,
  };
}

test("maps visits, points, and sales programmes from the existing tenant membership", () => {
  const visits = buildGoogleWalletPassReady(source());
  assert.equal(visits?.loyalty.loyaltyMode, "VISITS");
  assert.equal(visits?.loyalty.remaining, 1);
  const points = buildGoogleWalletPassReady(source({ business: { ...source().business, loyaltyMode: "POINTS" }, customer: { ...source().customer, balance: 7 } }));
  assert.equal(points?.loyalty.loyaltyMode, "POINTS");
  assert.equal(points?.loyalty.balance, 7);
  const sales = buildGoogleWalletPassReady(source({ business: { ...source().business, loyaltyMode: "SALES_AMOUNT", unitName: "EGP", rewardThreshold: 1000 }, customer: { ...source().customer, balance: 1000 } }));
  assert.equal(sales?.loyalty.loyaltyMode, "SALES_AMOUNT");
  assert.equal(sales?.loyalty.rewardReady, true);
});

test("maps reward-ready and public offers without an independent balance mutation", () => {
  const before = source({ customer: { ...source().customer, balance: 5 }, publicOffers: [{ name: "Weekend offer", description: "10% off" }] });
  const pass = buildGoogleWalletPassReady(before);
  assert.equal(pass?.loyalty.rewardReady, true);
  assert.equal(pass?.offerSummary, "Weekend offer — 10% off");
  assert.equal(before.customer.balance, 5);
  assert.equal(pass?.barcode?.value, before.publicCardUrl);
});

test("refuses cross-tenant or inactive sources and preserves public-card HTTPS compatibility", () => {
  assert.equal(buildGoogleWalletPassReady(source({ customer: { ...source().customer, businessId: "business-b" } })), null);
  assert.equal(buildGoogleWalletPassReady(source({ customer: { ...source().customer, isActive: false } })), null);
  assert.equal(buildGoogleWalletPassReady(source({ publicCardUrl: "http://app.example.test/card/token" })), null);
});

test("uses safe branding fallbacks and never enables an unimplemented provider", () => {
  const pass = buildGoogleWalletPassReady(source({ business: { ...source().business, logoUrl: "javascript:alert(1)", primaryColor: "bad" } }));
  assert.equal(pass?.display.logoUrl, null);
  assert.equal(pass?.display.primaryColor, "#2563eb");
  const disabled = getGoogleWalletFeatureState({ GOOGLE_WALLET_ENABLED: "false" });
  assert.deepEqual(disabled, { enabled: false, reason: "FLAG_DISABLED" });
  assert.equal(getGoogleWalletSyncDecision(disabled), "NOOP_DISABLED");
  assert.deepEqual(
    getGoogleWalletFeatureState({ GOOGLE_WALLET_ENABLED: "true", GOOGLE_WALLET_ISSUER_ID: "issuer", GOOGLE_WALLET_SERVICE_ACCOUNT_JSON: "secret-is-not-used" }),
    { enabled: false, reason: "PROVIDER_ADAPTER_UNAVAILABLE" }
  );
});
