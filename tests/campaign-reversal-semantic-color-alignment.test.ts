import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const legacyProductColor =
  /\b(?:bg|text|border|from|via|to)-(?:white|black|slate|gray|zinc|neutral|stone|emerald|amber|red|violet|rose|cyan)(?:-\d+)?(?:\/\d+)?\b/;

for (const path of [
  "app/businesses/[slug]/campaigns/page.tsx",
  "app/businesses/[slug]/customers/[customerId]/earn-reversal-panel.tsx",
  "app/businesses/[slug]/customers/[customerId]/redemption-reversal-panel.tsx",
  "app/businesses/[slug]/customers/[customerId]/redemption-reversal/page.tsx",
  "app/businesses/[slug]/customers/[customerId]/reversal/page.tsx",
]) {
  test(`${path} avoids legacy product colors`, () => {
    assert.doesNotMatch(source(path), legacyProductColor);
  });
}

test("Campaign feedback uses semantic success and info tones", () => {
  const campaigns = source("app/businesses/[slug]/campaigns/page.tsx");
  assert.match(campaigns, /bg-success-subtle text-success/);
  assert.match(campaigns, /border-info\/30 bg-info-subtle/);
  assert.match(campaigns, /text-info/);
});

test("Reversal controls use semantic surface and danger contrast", () => {
  const earn = source(
    "app/businesses/[slug]/customers/[customerId]/earn-reversal-panel.tsx",
  );
  const redeem = source(
    "app/businesses/[slug]/customers/[customerId]/redemption-reversal-panel.tsx",
  );

  assert.match(earn, /bg-surface/);
  assert.match(earn, /bg-danger[\s\S]*text-inverse/);
  assert.match(redeem, /bg-surface/);
  assert.match(redeem, /bg-danger[\s\S]*text-inverse/);
});
