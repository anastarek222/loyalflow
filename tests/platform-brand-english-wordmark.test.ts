import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const SOURCE_ROOTS = ["app", "components", "lib"] as const;
const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"]);
const ARABIC_WORDMARK_REFERENCE = /wordmarkAr|tanee-wordmark-ar/i;

function extension(path: string) {
  const dot = path.lastIndexOf(".");
  return dot === -1 ? "" : path.slice(dot);
}

function sourceFiles(root: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    if (statSync(path).isDirectory()) {
      files.push(...sourceFiles(path));
    } else if (SOURCE_EXTENSIONS.has(extension(path))) {
      files.push(path);
    }
  }

  return files;
}

test("Tanee renders the English wordmark for every locale", () => {
  const identity = readFileSync(
    join(process.cwd(), "components/platform-brand-identity.tsx"),
    "utf8",
  );

  assert.match(identity, /platformBrand\.assets\.wordmark/);
  assert.match(identity, /tanee-wordmark-en-dark\.svg/);
  assert.doesNotMatch(identity, /locale\.toLowerCase\(\)\s*===\s*["']ar["']/);
});

test("application source cannot reference an Arabic Tanee wordmark", () => {
  for (const root of SOURCE_ROOTS) {
    for (const path of sourceFiles(join(process.cwd(), root))) {
      assert.doesNotMatch(
        readFileSync(path, "utf8"),
        ARABIC_WORDMARK_REFERENCE,
        `Arabic Tanee wordmark reference found in ${path}`,
      );
    }
  }
});
