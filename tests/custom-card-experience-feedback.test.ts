import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("Stage 14 custom-card flow surfaces draft, publish and storage receipts", () => {
  const uploadAction = source(
    "app/businesses/[slug]/program/custom-card-upload-action.ts",
  );
  const publishAction = source(
    "app/businesses/[slug]/program/custom-card-publish-action.ts",
  );
  const status = source("components/custom-card-experience-status.tsx");
  const manager = source("components/custom-card-artwork-manager.tsx");

  assert.match(uploadAction, /cardDesign=draft&customVersion=/);
  assert.match(uploadAction, /cardDesign=storage-unavailable/);
  assert.match(publishAction, /cardDesign=published/);

  assert.doesNotMatch(status, /"use client"|useSearchParams/);
  assert.match(status, /status\?: string/);
  assert.match(status, /Front \+ Back draft created/);
  assert.match(status, /Front \+ Back pair published successfully/);
  assert.match(status, /Custom Card storage is currently unavailable/);
  assert.match(status, /combined Front \+ Back size is larger than 4 MB/);
  assert.match(status, /Pixel dimensions do not match/);
  assert.match(status, /wrong aspect ratio/);
  assert.match(status, /role=\{copy\.tone === "success" \? "status" : "alert"\}/);
  assert.match(
    status,
    /aria-live=\{copy\.tone === "success" \? "polite" : undefined\}/,
  );

  assert.match(manager, /CustomCardExperienceStatus/);
  assert.match(manager, /isArabic=\{language === "AR"\}/);
  assert.match(manager, /status=\{status\}/);
  assert.match(manager, /Artwork requirements/);
  assert.match(manager, /<details/);

  const page = source("app/businesses/[slug]/program/page.tsx");
  assert.match(page, /status=\{query\.cardDesign\}/);
});

test("Stage 14 custom-card feedback preserves preview and approval safeguards", () => {
  const manager = source("components/custom-card-artwork-manager.tsx");
  const renderer = source("components/custom-loyalty-card.tsx");

  assert.equal(
    (manager.match(/<LoyaltyCard/g) ?? []).length,
    2,
    "Front and Back drafts must use the customer-card renderer",
  );
  assert.match(manager, /side="front"/);
  assert.match(manager, /side="back"/);
  assert.match(manager, /runtime-accurate preview/);
  assert.match(
    renderer,
    /data-card-aspect-ratio=\{STANDARD_CARD_ASPECT_RATIO\.toFixed\(3\)\}/,
  );
  assert.match(renderer, /object-contain/);
  assert.match(manager, /ConfirmedSubmitButton/);
  assert.match(manager, /name="customVersion"/);
  assert.match(
    manager,
    /Uploading or previewing a draft never changes the customer-facing card/,
  );
});
