import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { marketingMessagesAr } from "../lib/i18n/locales/ar/marketing";
import { marketingMessagesEn } from "../lib/i18n/locales/en/marketing";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

test("marketing Arabic and English catalogs have exact key parity", () => {
  const enKeys = Object.keys(marketingMessagesEn).sort();
  const arKeys = Object.keys(marketingMessagesAr).sort();

  assert.deepEqual(arKeys, enKeys);
  assert.ok(enKeys.length > 0);
  assert.ok(enKeys.every((key) => key.startsWith("marketing.")));
});

test("web catalog composes marketing messages instead of owning bilingual copy", async () => {
  const catalog = await readFile(
    path.join(repositoryRoot, "lib/i18n/catalog.ts"),
    "utf8",
  );
  const marketing = await readFile(
    path.join(repositoryRoot, "lib/i18n/marketing.ts"),
    "utf8",
  );

  assert.match(catalog, /import \{ marketingMessages \} from "\.\/marketing"/);
  assert.match(catalog, /\.\.\.marketingMessages\.en/);
  assert.match(catalog, /\.\.\.marketingMessages\.ar/);
  assert.doesNotMatch(catalog, /"marketing\./);

  assert.match(marketing, /Record<keyof typeof marketingMessagesEn, string>/);
  assert.match(marketing, /Record<keyof typeof marketingMessagesAr, string>/);
});
