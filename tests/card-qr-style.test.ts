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

test("settings persist supported QR styles", () => {
  const actions = read(
    "app/businesses/[slug]/settings/actions.ts"
  );

  assert.match(actions, /qrStyle:\s*z\.enum/);
  assert.match(actions, /"CLASSIC"/);
  assert.match(actions, /"ROUNDED"/);
  assert.match(actions, /"BRANDED"/);
  assert.match(
    actions,
    /qrStyle:\s*parsed\.data\.qrStyle/
  );
});

test("public card uses persisted QR style", () => {
  const page = read("app/card/[token]/page.tsx");
  const component = read(
    "components/auto-flip-membership-card.tsx"
  );

  assert.match(page, /business\.qrStyle/);
  assert.match(page, /errorCorrectionLevel/);
  assert.match(page, /qrStyle=\{/);

  assert.match(component, /qrStyle\?/);
  assert.match(component, /data-qr-style/);
});

test("public card API exposes QR style only as branding", () => {
  const route = read("app/api/card/[token]/route.ts");

  assert.match(
    route,
    /qrStyle:\s*customer\.business\.qrStyle/
  );
});


test("persists and renders QR position", () => {
  const schema = read("prisma/schema.prisma");
  const actions = read(
    "app/businesses/[slug]/settings/actions.ts"
  );
  const form = read(
    "components/business-settings-form.tsx"
  );
  const card = read(
    "components/auto-flip-membership-card.tsx"
  );

  assert.match(
    schema,
    /qrPosition\s+String\s+@default\("CENTER"\)/
  );

  assert.match(
    actions,
    /qrPosition:\s*z\.enum/
  );

  assert.match(
    actions,
    /qrPosition:\s*parsed\.data\.qrPosition/
  );

  assert.match(
    form,
    /name="qrPosition"/
  );

  assert.match(
    card,
    /qrPositionClass/
  );
});
