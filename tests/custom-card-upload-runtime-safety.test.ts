import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [
  nextConfigSource,
  managerSource,
  frontActionSource,
  backCommandSource,
] = await Promise.all([
  readFile("next.config.ts", "utf8"),
  readFile("components/custom-card-artwork-manager.tsx", "utf8"),
  readFile(
    "app/businesses/[slug]/program/custom-card-upload-action.ts",
    "utf8",
  ),
  readFile(
    "lib/server/business/custom-card-back-upload-command.ts",
    "utf8",
  ),
]);

test("custom card server actions allow one 4 MB side without exceeding hosting payload ceiling", () => {
  assert.match(nextConfigSource, /bodySizeLimit:\s*["']4250kb["']/);
});

test("custom card manager sends Front and Back through separate actions", () => {
  assert.match(managerSource, /action=\{uploadCustomArtwork\}/);
  assert.match(managerSource, /name="customCardFrontFile"/);
  assert.match(managerSource, /action=\{uploadCustomBack\}/);
  assert.match(managerSource, /name="customCardBackFile"/);

  assert.match(
    frontActionSource,
    /front:\s*formData\.get\("customCardFrontFile"\)/,
  );
  assert.doesNotMatch(frontActionSource, /customCardBackFile/);
});

test("Back upload preserves immutable versioning and validates against stored Front server-side", () => {
  assert.match(backCommandSource, /findCustomCardArtworkVersion/);
  assert.match(backCommandSource, /readPrivateCustomCardArtwork/);
  assert.match(backCommandSource, /validateCustomCardArtworkPair\(front, input\.back\)/);
  assert.match(backCommandSource, /const version = randomUUID\(\)/);
  assert.match(backCommandSource, /uploadCustomCardArtwork/);
});
