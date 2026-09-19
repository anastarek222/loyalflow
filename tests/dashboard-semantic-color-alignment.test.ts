import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboard = readFileSync(
  new URL("../app/businesses/[slug]/page.tsx", import.meta.url),
  "utf8",
);

test("dashboard cards avoid light-only product surfaces", () => {
  for (const legacy of [
    "border-white/80",
    "bg-white/85",
    "bg-white/70",
    "from-white",
  ]) {
    assert.equal(
      dashboard.includes(legacy),
      false,
      `dashboard should not use ${legacy}`,
    );
  }

  assert.match(dashboard, /border-border bg-surface/);
  assert.match(dashboard, /bg-surface-subtle/);
  assert.match(dashboard, /--lf-warning-subtle/);
  assert.match(dashboard, /--lf-success-subtle/);
  assert.match(dashboard, /text-primary-foreground/);
});

test("dashboard keeps fixed white contrast only inside the branded scan gradient", () => {
  const fixedWhiteMatches =
    dashboard.match(/(?:bg-white|text-white)(?:\/\d+)?/g) ?? [];

  assert.deepEqual(fixedWhiteMatches.sort(), [
    "bg-white/15",
    "bg-white/20",
    "text-white",
    "text-white/75",
    "text-white/80",
  ].sort());

  assert.match(
    dashboard,
    /bg-gradient-to-br from-indigo-500 via-primary to-indigo-800[\s\S]*?text-white/,
  );
});
