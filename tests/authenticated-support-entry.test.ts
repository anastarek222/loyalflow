import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

test("authenticated shell exposes one bilingual Help and Support entry", () => {
  const shell = source("components/authenticated-app-shell.tsx");
  const support = source("components/authenticated-support-link.tsx");

  assert.match(shell, /AuthenticatedSupportLink language=\{language\}/);
  assert.match(support, /href="\/contact"/);
  assert.match(support, /data-testid="authenticated-support-link"/);
  assert.match(support, /المساعدة والدعم/);
  assert.match(support, /Help & Support/);
});

test("authenticated Help entry remains usable above mobile navigation and on desktop", () => {
  const support = source("components/authenticated-support-link.tsx");

  assert.match(
    support,
    /bottom-\[calc\(var\(--lf-mobile-nav-height\)\+0\.75rem\)\]/,
  );
  assert.match(support, /min-h-11/);
  assert.match(support, /lg:bottom-5/);
  assert.match(support, /focus-visible:ring-2/);
});
