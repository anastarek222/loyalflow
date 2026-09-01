import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (file: string) =>
  readFileSync(join(process.cwd(), file), "utf8");

test("Business logo uses one full-frame HTML presentation across setup and enrollment", () => {
  const logo = source("components/business-logo-image.tsx");
  const setup = source("components/business-setup-wizard.tsx");
  const cropField = source("components/business-logo-crop-field.tsx");
  const directConsumers = [
    source("app/join/[slug]/page.tsx"),
    source("components/owner-onboarding-wizard.tsx"),
    source("components/standard-card-setup.tsx"),
    cropField,
  ];

  assert.match(logo, /size-full object-cover object-center/);
  assert.doesNotMatch(logo, /object-contain|\bp-[0-9]/);
  assert.match(setup, /BusinessLogoCropField/);
  for (const consumer of directConsumers) {
    assert.match(consumer, /BusinessLogoImage/);
  }
});

test("Standard Card logo fills the same rounded SVG frame on both sides", () => {
  const presentation = source("lib/branding/logo-presentation.ts");
  const card = source("components/standard-loyalty-card.tsx");

  assert.match(presentation, /xMidYMid slice/);
  assert.equal(
    card.match(/preserveAspectRatio=\{BUSINESS_LOGO_SVG_ASPECT_RATIO\}/g)
      ?.length,
    2,
  );
  assert.equal(
    card.match(/clipPath=\{`url\(#\$\{id\}-logo-clip\)`\}/g)?.length,
    2,
  );
  assert.doesNotMatch(card, /x="47"|width="54"|x=\{logoX \+ 5\}/);
});

test("installed card icons retain full-bleed iOS and mask-safe Android behavior", () => {
  const icon = source("app/api/card-icon/[token]/route.tsx");
  const manifest = source("app/api/card-manifest/[token]/route.ts");

  assert.match(icon, /objectFit: maskable \? 'contain' : 'cover'/);
  assert.match(
    icon,
    /const logoFrameSize = maskable \? scaled\(390\) : iconSize/,
  );
  assert.match(manifest, /size=192&purpose=any/);
  assert.match(manifest, /purpose=maskable/);
});
