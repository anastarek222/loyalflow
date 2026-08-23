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

test("FV12 marketing accessibility labels stay in AR/EN catalog parity", async () => {
  const [english, arabic] = await Promise.all([
    source("lib/i18n/locales/en/marketing.ts"),
    source("lib/i18n/locales/ar/marketing.ts"),
  ]);

  assert.match(english, /"marketing\.trustSectionLabel":\s*"Core product qualities"/);
  assert.match(arabic, /"marketing\.trustSectionLabel":\s*"مزايا أساسية"/);
});

test("FV12 homepage consumes the catalog label instead of inline bilingual copy", async () => {
  const page = await source("app/page.tsx");

  assert.match(page, /aria-label=\{copy\("marketing\.trustSectionLabel"\)\}/);
  assert.doesNotMatch(page, /locale === "ar" \? "مزايا أساسية" : "Core product qualities"/);
});
