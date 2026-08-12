import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const root = process.cwd();

function read(file: string) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

test("business schema contains persisted qrStyle", () => {
  const schema = read("prisma/schema.prisma");

  assert.match(
    schema,
    /qrStyle\s+String\s+@default\("CLASSIC"\)/
  );
});

test("domain Settings updates preserve the stored QR style", () => {
  const actions = read(
    "app/businesses/[slug]/settings/actions.ts"
  );
  const form = read("components/business-settings-form.tsx");

  assert.doesNotMatch(actions, /qrStyle:\s*parsed\.data\.qrStyle/);
  assert.doesNotMatch(form, /name="qrStyle"/);
});

test("public card keeps the QR destination but Standard Card owns its fixed QR safe zone", () => {
  const page = read("app/card/[token]/page.tsx");
  const component = read("components/standard-loyalty-card.tsx");

  assert.match(page, /business\.qrStyle/);
  assert.match(page, /errorCorrectionLevel/);
  assert.match(page, /LoyaltyCard/);

  assert.match(component, /data-safe-zone="qr-code"/);
});

test("public card API exposes QR style only as branding", () => {
  const route = read("app/api/card/[token]/route.ts");

  assert.match(
    route,
    /qrStyle:\s*customer\.business\.qrStyle/
  );
});


test("preserves the legacy QR position without making it a second card renderer authority", () => {
  const schema = read("prisma/schema.prisma");
  const actions = read(
    "app/businesses/[slug]/settings/actions.ts"
  );
  const form = read(
    "components/business-settings-form.tsx"
  );
  const card = read("components/standard-loyalty-card.tsx");

  assert.match(
    schema,
    /qrPosition\s+String\s+@default\("CENTER"\)/
  );

  assert.doesNotMatch(actions, /qrPosition:\s*parsed\.data\.qrPosition/);
  assert.doesNotMatch(form, /name="qrPosition"/);

  assert.match(
    card,
    /data-safe-zone="qr-code"/
  );
});
