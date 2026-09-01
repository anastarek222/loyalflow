import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  getMarketingDemoEmbedUrl,
  marketingDemoMedia,
} from "../lib/marketing/demo-media";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("marketing demo stays fail-closed until Owner supplies real media", () => {
  assert.equal(marketingDemoMedia.embedUrl, null);
  assert.equal(getMarketingDemoEmbedUrl(), null);
});

test("marketing demo accepts only trusted HTTPS embed surfaces", () => {
  assert.equal(
    getMarketingDemoEmbedUrl("https://www.youtube-nocookie.com/embed/demo123"),
    "https://www.youtube-nocookie.com/embed/demo123",
  );
  assert.equal(
    getMarketingDemoEmbedUrl("https://player.vimeo.com/video/123456"),
    "https://player.vimeo.com/video/123456",
  );
  assert.equal(getMarketingDemoEmbedUrl("http://www.youtube.com/embed/demo123"), null);
  assert.equal(getMarketingDemoEmbedUrl("https://example.com/embed/demo123"), null);
  assert.equal(getMarketingDemoEmbedUrl("not-a-url"), null);
});

test("public demo route returns 404 while media is absent and renders only the validated embed", () => {
  const page = source("app/demo/page.tsx");

  assert.match(page, /const embedUrl = getMarketingDemoEmbedUrl\(\)/);
  assert.match(page, /if \(!embedUrl\) notFound\(\)/);
  assert.match(page, /src=\{embedUrl\}/);
  assert.match(page, /referrerPolicy="strict-origin-when-cross-origin"/);
  assert.match(page, /robots: \{ index: false, follow: false \}/);
});
