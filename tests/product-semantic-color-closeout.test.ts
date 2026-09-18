import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const legacyGenericColor =
  /\b(?:bg|text|border|from|via|to)-(?:white|black|slate|gray|zinc|neutral|stone|emerald|amber|red|violet|rose|cyan)(?:-\d+)?(?:\/\d+)?\b/;

const strictProductPaths = [
  "app/account/security/password-change-form-view.tsx",
  "app/account/security/logout-everywhere-form.tsx",
  "app/business-owners/page.tsx",
  "app/dashboard/page.tsx",
  "app/plans/page.tsx",
  "app/businesses/[slug]/campaigns/page.tsx",
  "app/businesses/[slug]/recovery/page.tsx",
  "app/businesses/[slug]/offers/page.tsx",
  "app/businesses/[slug]/reports/referrals/page.tsx",
  "app/businesses/[slug]/reports/staff/page.tsx",
  "app/businesses/[slug]/reports/reversal-exceptions/page.tsx",
  "app/businesses/[slug]/reports/reversal-exception-resolution-panel.tsx",
  "app/businesses/[slug]/customers/[customerId]/earn-reversal-panel.tsx",
  "app/businesses/[slug]/customers/[customerId]/redemption-reversal-panel.tsx",
  "app/businesses/[slug]/customers/[customerId]/redemption-reversal/page.tsx",
  "app/businesses/[slug]/customers/[customerId]/reversal/page.tsx",
  "app/businesses/[slug]/settings/whatsapp/page.tsx",
  "app/businesses/[slug]/users/page.tsx",
  "components/business-deletion-danger-zone.tsx",
  "components/business-settings-form.tsx",
  "components/card-business-details-form.tsx",
  "components/custom-card-artwork-manager.tsx",
  "components/custom-card-experience-status.tsx",
  "components/customer-messages-form.tsx",
  "components/scan-customer-search.tsx",
] as const;

for (const path of strictProductPaths) {
  test(`${path} keeps generic product chrome semantic`, () => {
    assert.doesNotMatch(source(path), legacyGenericColor);
  });
}

test("Identity-gradient product pages keep hard-coded color limited to the intentional hero treatment", () => {
  for (const path of [
    "app/businesses/[slug]/program/page.tsx",
    "app/businesses/[slug]/rewards/page.tsx",
    "app/businesses/[slug]/customers/[customerId]/page.tsx",
  ]) {
    const contents = source(path);
    assert.doesNotMatch(contents, /\bbg-white(?=[\s"])/);
    assert.doesNotMatch(contents, /\btext-slate-/);
    assert.match(contents, /bg-gradient-to-br from-primary via-indigo-600 to-violet-700/);
  }
});

test("QR scanability white is isolated to the settings QR image surface", () => {
  const settings = source("app/businesses/[slug]/settings/page.tsx");
  const fixedWhite = settings.match(/\bbg-white\b/g) ?? [];

  assert.equal(fixedWhite.length, 1);
  assert.match(
    settings,
    /h-48 w-48 rounded-\[var\(--lf-radius-card\)\] border border-border bg-white p-2/,
  );
});

test("Scanner routes use semantic control contrast while retaining scanner-specific inverse visuals", () => {
  const scan = source("app/businesses/[slug]/scan/page.tsx");
  const customer = source(
    "app/businesses/[slug]/scan/customer/[customerId]/page.tsx",
  );

  assert.match(scan, /bg-primary text-primary-foreground/);
  assert.doesNotMatch(scan, /bg-primary[^"\n]*text-white/);
  assert.match(customer, /bg-success text-inverse/);
  assert.match(customer, /bg-primary[^"\n]*text-primary-foreground/);
  assert.doesNotMatch(customer, /bg-primary[^"\n]*text-white/);
});


test("Standard card setup keeps fixed colours inside preview and brand swatches only", () => {
  const setup = source("components/standard-card-setup.tsx");
  const fixedWhite = setup.match(/\bbg-white\b/g) ?? [];

  assert.equal(fixedWhite.length, 1);
  assert.match(
    setup,
    /rounded-lg border border-border bg-white font-black/,
  );
  assert.match(
    setup,
    /type="color"[\s\S]*?border border-border bg-surface p-1/,
  );
  assert.match(
    setup,
    /font-mono text-sm text-foreground uppercase/,
  );
  assert.match(
    setup,
    /select[\s\S]*?border border-border bg-surface px-3 py-3 text-foreground/,
  );
});

test("Primary business join QR keeps white isolated to the generated QR image", () => {
  const joinQr = source("components/primary-business-join-qr.tsx");
  const fixedWhite = joinQr.match(/\bbg-white\b/g) ?? [];

  assert.equal(fixedWhite.length, 1);
  assert.match(joinQr, /aspect-square w-full max-w-56[\s\S]*?bg-white p-3/);
  assert.match(joinQr, /border border-primary\/15 bg-surface shadow-sm/);
  assert.match(joinQr, /bg-primary[\s\S]*?text-primary-foreground/);
});

test("QR scanner keeps fixed black and white inside the camera reader only", () => {
  const scanner = source("components/qr-scanner.tsx");

  assert.match(scanner, /bg-slate-950 p-2 shadow-inner/);
  assert.match(scanner, /border border-white\/10 bg-white p-2/);
  assert.doesNotMatch(scanner, /bg-primary[^"\n]*text-white/);
  assert.doesNotMatch(scanner, /\btext-black\b/);
  assert.match(
    scanner,
    /border border-border bg-surface px-4 text-foreground/,
  );
});
