import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("Stage 13 offer cards localize known customer segment labels", () => {
  const offers = source("app/businesses/[slug]/offers/page.tsx");

  assert.match(
    offers,
    /const knownSegment = customerSegments\.find\(\(candidate\) => candidate === segment\);/,
  );
  assert.match(
    offers,
    /getCustomerSegmentLabel\(knownSegment, language\)/,
  );
  assert.match(
    offers,
    /`شريحة: \$\{segmentLabel\}` : `Segment: \$\{segmentLabel\}`/,
  );
  assert.doesNotMatch(offers, /`شريحة: \$\{segment\}` : `Segment: \$\{segment\}`/);
});

test("Stage 13 offer segment localization preserves form and action boundaries", () => {
  const offers = source("app/businesses/[slug]/offers/page.tsx");

  assert.match(offers, /customerSegments\.map\(\(segment\) => \(/);
  assert.match(offers, /getCustomerSegmentLabel\(segment, language\)/);
  assert.match(offers, /createOfferAction\.bind\(null, business\.slug\)/);
  assert.match(offers, /updateOfferAction\.bind\(/);
  assert.match(offers, /toggleOfferStatusAction\.bind\(/);
});
