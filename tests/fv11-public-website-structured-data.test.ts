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

test("FV11 public structured data is a bounded WebSite identity only", async () => {
  const helper = await source("lib/seo/public-website-structured-data.ts");

  assert.match(helper, /"@context":\s*"https:\/\/schema\.org"/);
  assert.match(helper, /"@type":\s*"WebSite"/);
  assert.match(helper, /name:\s*platformBrand\.name/);
  assert.match(helper, /url:\s*PUBLIC_SITE_URL/);
  assert.match(helper, /description,/);
  assert.match(helper, /inLanguage:\s*locale/);
  assert.doesNotMatch(
    helper,
    /Organization|LocalBusiness|offers|aggregateRating|review|price|address/,
  );
});

test("FV11 homepage emits the structured data from approved localized copy", async () => {
  const page = await source("app/page.tsx");

  assert.match(
    page,
    /buildPublicWebsiteStructuredData\(\{[\s\S]*description:\s*copy\("marketing\.metaDescription"\),[\s\S]*locale,[\s\S]*\}\)/,
  );
  assert.match(page, /type="application\/ld\+json"/);
  assert.match(
    page,
    /JSON\.stringify\(websiteStructuredData\)\.replace\(\/<\/g,\s*"\\\\u003c"\)/,
  );
  assert.doesNotMatch(page, /aggregateRating|reviewCount|priceCurrency/);
});
