import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

test("Super Admin sees retained Custom Card pairs as a reusable library", () => {
  const manager = source("components/custom-card-artwork-manager.tsx");

  assert.match(manager, /data-testid="custom-card-retained-library"/);
  assert.match(manager, /Saved Custom Card library/);
  assert.match(manager, /evergreen design alongside seasonal alternatives/);
  assert.match(manager, /Preview and select this design/);
  assert.match(manager, /savedVersionFormatter\.format\(version\.uploadedAt\)/);
});

test("publishing a retained pair switches pointers without deleting saved artwork", () => {
  const publish = source(
    "lib/server/business/custom-card-publish-command.ts",
  );
  const storage = source("lib/cards/custom-card-storage.ts");

  assert.match(publish, /customCardFrontArtworkUrl: input\.frontUrl/);
  assert.match(publish, /customCardBackArtworkUrl: input\.backUrl/);
  assert.doesNotMatch(publish, /del\(|delete|remove/i);
  assert.match(storage, /listCustomCardArtworkVersions/);
  assert.match(storage, /sort\(\(left, right\) => right\.uploadedAt\.getTime\(\) - left\.uploadedAt\.getTime\(\)\)/);
});
