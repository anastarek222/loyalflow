import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const handoff = readFileSync(
  join(process.cwd(), "DEVELOPER_HANDOFF.md"),
  "utf8",
);
const normalized = handoff.toLowerCase();

test("developer handoff requires one paired Custom Card artwork draft", () => {
  assert.match(handoff, /Front \+ Back pair uploaded together/);
  assert.match(handoff, /Both sides are required/);
  assert.match(handoff, /PNG \/ JPEG \/ WebP/);
  assert.match(handoff, /856 × 540/);
  assert.match(handoff, /exact same pixel dimensions/);
  assert.match(handoff, /standard ID-1 card aspect ratio/);
});

test("developer handoff forbids generated or substituted Custom Card artwork", () => {
  assert.doesNotMatch(normalized, /back artwork may be supplied or safely generated/);
  assert.match(
    normalized,
    /never generates, reconstructs, or substitutes missing artwork/,
  );
  assert.match(normalized, /any system-generated custom card artwork/);
});

test("developer handoff preserves current Custom Card presentation and lifecycle authority", () => {
  assert.match(
    handoff,
    /Front = QR, customer name and the active loyalty balance\/value/,
  );
  assert.match(handoff, /Back = reward plus score\/progress/);
  assert.match(handoff, /Publishing is a separate explicit confirmed action/);
  assert.match(
    handoff,
    /publishing switches the active pair without deleting retained versions/,
  );
  assert.match(handoff, /Exactly one pair is published for customers at a time/);
  assert.match(handoff, /Do not invent a hard retained-version cap/);
  assert.match(
    handoff,
    /same physical aspect ratio, silhouette\/corner treatment and Front\/Back flip behavior/,
  );
});
