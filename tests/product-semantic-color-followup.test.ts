import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const legacyProductColor =
  /\b(?:bg|text|border|from|via|to)-(?:white|black|slate|gray|zinc|neutral|stone|emerald|amber|red|violet|rose|cyan)(?:-\d+)?(?:\/\d+)?\b/;

for (const path of [
  "app/businesses/[slug]/recovery/page.tsx",
  "app/businesses/[slug]/reports/reversal-exceptions/page.tsx",
  "app/businesses/[slug]/offers/page.tsx",
  "app/businesses/[slug]/reports/referrals/page.tsx",
]) {
  test(`${path} uses semantic product colors`, () => {
    assert.doesNotMatch(source(path), legacyProductColor);
  });
}

test("Recovery and offers use semantic feedback/status surfaces", () => {
  const recovery = source("app/businesses/[slug]/recovery/page.tsx");
  const offers = source("app/businesses/[slug]/offers/page.tsx");

  assert.match(recovery, /bg-success-subtle/);
  assert.match(recovery, /bg-warning-subtle/);
  assert.match(recovery, /text-primary-foreground/);
  assert.match(offers, /border-success\/30 bg-success-subtle/);
  assert.match(offers, /border-danger\/30 bg-danger-subtle/);
  assert.match(offers, /text-primary-foreground/);
});

test("Reversal exceptions use warning, success, and danger semantics", () => {
  const exceptions = source(
    "app/businesses/[slug]/reports/reversal-exceptions/page.tsx",
  );

  assert.match(exceptions, /bg-warning-subtle[^\"\\n]*text-warning/);
  assert.match(exceptions, /border-success\/30[^"\n]*bg-success-subtle[^"\n]*text-success/);
  assert.match(exceptions, /border-danger\/30[^"\n]*bg-danger-subtle[^"\n]*text-danger/);
});
