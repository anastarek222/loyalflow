import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

async function source(relativePath: string) {
  return readFile(path.join(repositoryRoot, relativePath), "utf8");
}

test("public social metadata reuses approved page copy without inventing artwork", async () => {
  const helper = await source("lib/seo/public-social-metadata.ts");

  assert.match(helper, /type:\s*"website"/);
  assert.match(helper, /siteName:\s*platformBrand\.name/);
  assert.match(helper, /title,/);
  assert.match(helper, /description,/);
  assert.match(helper, /publicSiteUrl/);
  assert.match(helper, /url:\s*publicSiteUrl\(path\)/);
  assert.match(helper, /card:\s*"summary"/);
  assert.doesNotMatch(helper, /images\s*:/);
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
    /\.\.\.buildPublicSocialMetadata\(\{\s*title,\s*description,\s*path: "\/",\s*\}\)/,
  );

  assert.match(getStarted, /const title = translate\(locale, "conversion\.metaTitle"\)/);
  assert.match(getStarted, /const description = translate\(locale, "conversion\.metaDescription"\)/);
  assert.match(
    getStarted,
    /\.\.\.buildPublicSocialMetadata\(\{\s*title,\s*description,\s*path: "\/get-started",\s*\}\)/,
  );
});
