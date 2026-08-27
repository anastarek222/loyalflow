import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("public Customer Card exposes a subtle bilingual LoyalFlow acquisition CTA outside the card artwork", () => {
  const actions = source("components/customer-experience/public-card-actions.tsx");

  assert.match(actions, /data-testid="customer-loyalflow-attribution"/);
  assert.match(actions, /href="\/features"/);
  assert.match(actions, /مدعوم من LoyalFlow · هل تريد برنامج ولاء لنشاطك؟/);
  assert.match(actions, /Powered by LoyalFlow · Want loyalty for your business\?/);
  assert.match(actions, /border-t border-slate-200\/80/);
});
