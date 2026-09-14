import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  CARD_COLOR_SEMANTICS,
  resolveCardColorRoles,
} from "@/lib/cards/card-color-semantics";

test("primary is accent and secondary is the supporting surface", () => {
  assert.deepEqual(CARD_COLOR_SEMANTICS, {
    primaryColor: "ACCENT",
    secondaryColor: "SUPPORTING_SURFACE",
  });
  assert.deepEqual(
    resolveCardColorRoles({ primaryColor: "#123456", secondaryColor: "#ABCDEF" }),
    { accentColor: "#123456", supportingSurfaceColor: "#ABCDEF" },
  );
});

test("Standard and Custom renderers consume the same explicit color roles", () => {
  const root = process.cwd();
  for (const file of [
    "components/standard-loyalty-card.tsx",
    "components/custom-loyalty-card.tsx",
  ]) {
    const source = readFileSync(join(root, file), "utf8");
    assert.match(source, /resolveCardColorRoles\(props\)/);
    assert.match(source, /safeColor\(colorRoles\.accentColor\)/);
    assert.match(source, /safeColor\(colorRoles\.supportingSurfaceColor\)/);
  }
});
