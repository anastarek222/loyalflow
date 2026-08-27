import assert from "node:assert/strict";
import test from "node:test";

import {
  MARKETING_CONVERSION_BROWSER_EVENT,
  MARKETING_CONVERSION_EVENTS,
  MARKETING_CONVERSION_SERVER_EVIDENCE,
  createMarketingConversionDetail,
} from "../lib/marketing/conversion-events";

test("marketing conversion authority exposes the master-plan event set", () => {
  assert.deepEqual(MARKETING_CONVERSION_EVENTS, [
    "cta",
    "contact",
    "demo",
    "onboarding_start",
    "onboarding_complete",
    "business_created",
  ]);
  assert.equal(
    MARKETING_CONVERSION_BROWSER_EVENT,
    "loyalflow:marketing-conversion",
  );
});

test("conversion details stay bounded and contain no arbitrary payload", () => {
  const detail = createMarketingConversionDetail(
    "cta",
    `  ${"source".repeat(30)}  `,
    `/${"target".repeat(40)}`,
  );

  assert.equal(detail.event, "cta");
  assert.equal(detail.source.length, 80);
  assert.equal(detail.target?.length, 160);
  assert.deepEqual(Object.keys(detail), ["event", "source", "target"]);
});

test("business completion events require committed transaction evidence", () => {
  assert.equal(
    MARKETING_CONVERSION_SERVER_EVIDENCE.onboarding_complete,
    "BUSINESS_CREATE_TX_COMMITTED",
  );
  assert.equal(
    MARKETING_CONVERSION_SERVER_EVIDENCE.business_created,
    "BUSINESS_CREATE_TX_COMMITTED",
  );
  assert.notEqual(
    MARKETING_CONVERSION_SERVER_EVIDENCE.business_created,
    "BUSINESS_CREATE_BUSINESS_CREATED",
  );
});
