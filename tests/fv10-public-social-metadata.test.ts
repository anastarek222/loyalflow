import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { buildPublicSocialMetadata } from "../lib/seo/public-social-metadata";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

async function source(relativePath: string) {
  return readFile(path.join(repositoryRoot, relativePath), "utf8");
}

test("public social metadata reuses approved page copy without inventing artwork", () => {
  const metadata = buildPublicSocialMetadata({
    title: "Localized page title",
    description: "Localized page description",
    path: "/get-started",
  });

  assert.deepEqual(metadata.openGraph, {
    type: "website",
    siteName: "LoyalFlow",
    title: "Localized page title",
    description: "Localized page description",
    url: "/get-started",
  });
  assert.deepEqual(metadata.twitter, {
    card: "summary",
    title: "Localized page title",
    description: "Localized page description",
  });
  assert.equal("images" in (metadata.openGraph ?? {}), false);
  assert.equal("images" in (metadata.twitter ?? {}), false);
});

test("approved indexable pages project their localized metadata into social cards", async () => {
  const [home, getStarted] = await Promise.all([
    source("app/page.tsx"),
    source("app/get-started/page.tsx"),
  ]);

  assert.match(home, /const title = translate\(locale, "marketing\.metaTitle"\)/);
  assert.match(home, /const description = translate\(locale, "marketing\.metaDescription"\)/);
  assert.match(
    home,
    /\.\.\.buildPublicSocialMetadata\(\{\s*title,\s*description,\s*path: "\/",\s*\}\)/s,
  );

  assert.match(getStarted, /const title = translate\(locale, "conversion\.metaTitle"\)/);
  assert.match(getStarted, /const description = translate\(locale, "conversion\.metaDescription"\)/);
  assert.match(
    getStarted,
    /\.\.\.buildPublicSocialMetadata\(\{\s*title,\s*description,\s*path: "\/get-started",\s*\}\)/s,
  );
});
