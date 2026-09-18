import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("marketing footer keeps accessible touch and focus targets", () => {
  const footer = source("components/marketing/marketing-footer.tsx");

  assert.match(footer, /data-testid="marketing-footer"/);
  assert.match(footer, /data-testid="marketing-footer-navigation"/);
  assert.match(footer, /inline-flex min-h-11 items-center rounded-lg/);
  assert.match(footer, /focus-visible:ring-2/);
  assert.match(footer, /focus-visible:ring-primary\/30/);
  assert.match(footer, /focus-visible:ring-offset-\[var\(--lf-surface\)\]/);
  assert.match(footer, /mt-3 space-y-0/);
});
