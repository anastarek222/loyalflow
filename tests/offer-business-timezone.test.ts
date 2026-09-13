import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { normalizeOfferInput, offerInputSchema } from "../lib/offers/catalog";
import { formatOfferDateInput } from "../lib/offers/date-window";

const parsed = offerInputSchema.parse({
  name: "Local-day offer",
  validFrom: "2026-01-20",
  validUntil: "2026-01-21",
  eligibility: "ALL",
});

test("offer date-only windows use the business local calendar day", () => {
  const normalized = normalizeOfferInput(parsed, "Europe/Zurich");

  assert.equal(normalized.validFrom?.toISOString(), "2026-01-19T23:00:00.000Z");
  assert.equal(normalized.validUntil?.toISOString(), "2026-01-21T22:59:59.999Z");
  assert.equal(formatOfferDateInput(normalized.validFrom, "Europe/Zurich"), "2026-01-20");
  assert.equal(formatOfferDateInput(normalized.validUntil, "Europe/Zurich"), "2026-01-21");
});

test("offer normalization keeps UTC as a backward-compatible default", () => {
  const normalized = normalizeOfferInput(parsed);

  assert.equal(normalized.validFrom?.toISOString(), "2026-01-20T00:00:00.000Z");
  assert.equal(normalized.validUntil?.toISOString(), "2026-01-21T23:59:59.999Z");
});

test("offer server actions pass the business timezone into normalization", () => {
  const actions = fs.readFileSync(
    path.join(process.cwd(), "app/businesses/[slug]/offers/actions.ts"),
    "utf8",
  );

  assert.match(actions, /timezone:\s*true/);
  assert.equal(
    (actions.match(/normalizeOfferInput\(parsed\.data,\s*business\.timezone\s*\?\?\s*"UTC"\)/g) ?? []).length,
    2,
  );
});
