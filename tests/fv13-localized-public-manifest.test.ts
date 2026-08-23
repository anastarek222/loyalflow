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

test("FV13 public manifest follows the shared request locale authority", async () => {
  const manifest = await source("app/manifest.ts");

  assert.match(manifest, /import \{ cookies \} from "next\/headers";/);
  assert.match(manifest, /LOCALE_COOKIE_NAME, resolveRequestLocale/);
  assert.match(manifest, /getLocaleDirection/);
  assert.match(manifest, /translate/);
  assert.match(manifest, /export default async function manifest\(\)/);
  assert.match(manifest, /resolveRequestLocale\(cookieStore\.get\(LOCALE_COOKIE_NAME\)\?\.value\)/);
  assert.match(manifest, /description:\s*translate\(locale, "marketing\.metaDescription"\)/);
  assert.match(manifest, /lang:\s*locale/);
  assert.match(manifest, /dir:\s*getLocaleDirection\(locale\)/);
});

test("FV13 public manifest no longer hardcodes Arabic-only presentation", async () => {
  const manifest = await source("app/manifest.ts");

  assert.doesNotMatch(manifest, /manifestDescriptionAr/);
  assert.doesNotMatch(manifest, /lang:\s*"ar"/);
  assert.doesNotMatch(manifest, /dir:\s*"rtl"/);
});
