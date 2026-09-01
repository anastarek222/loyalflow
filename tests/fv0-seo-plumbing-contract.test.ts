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

test("public SEO routes stay limited to approved marketing surfaces", async () => {
  const [layout, home, getStarted, sitemap, robots, publicUrl] =
    await Promise.all([
      source("app/layout.tsx"),
      source("app/page.tsx"),
      source("app/get-started/page.tsx"),
      source("app/sitemap.ts"),
      source("app/robots.ts"),
      source("lib/urls/public-site-url.ts"),
    ]);

  assert.match(layout, /metadataBase:\s*new URL\(PUBLIC_SITE_URL\)/);
  assert.match(layout, /index:\s*false/);
  assert.match(layout, /follow:\s*false/);
  assert.match(home, /index:\s*true/);
  assert.match(home, /canonical:\s*"\/"/);
  assert.match(getStarted, /index:\s*true/);
  assert.match(getStarted, /canonical:\s*"\/get-started"/);

  assert.match(sitemap, /publicSiteUrl\("\/"\)/);
  assert.match(sitemap, /publicSiteUrl\("\/get-started"\)/);
  assert.doesNotMatch(sitemap, /\/dashboard|\/businesses|\/login|\/card\//);

  assert.match(robots, /"\/api\/"/);
  assert.match(robots, /"\/dashboard"/);
  assert.match(robots, /"\/businesses"/);
  assert.match(robots, /"\/card\/"/);
  assert.match(robots, /"\/join\/"/);
  assert.match(robots, /"\/login"/);
  assert.match(robots, /publicSiteUrl\("\/sitemap\.xml"\)/);

  assert.match(publicUrl, /DEFAULT_PUBLIC_SITE_URL/);
  assert.match(publicUrl, /gettanee\.com/);
});
