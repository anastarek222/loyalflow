import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(relativePath: string) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("public fallback states share Tanee visual identity", () => {
  const shell = source("components/public/public-state-shell.tsx");
  const cardNotFound = source("app/card/[token]/not-found.tsx");
  const joinNotFound = source("app/join/[slug]/not-found.tsx");
  const rootNotFound = source("app/not-found.tsx");

  assert.match(shell, /PlatformBrandIdentity/);
  assert.match(shell, /DirectionText/);
  assert.match(shell, /bg-surface/);

  for (const page of [cardNotFound, joinNotFound, rootNotFound]) {
    assert.match(page, /PublicStateShell/);
    assert.doesNotMatch(page, /bg-slate|text-slate|>L</);
  }

  assert.match(joinNotFound, /التسجيل غير متاح/);
  assert.match(cardNotFound, /البطاقة غير متاحة/);
});
