import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { isMarketingRouteActive } from "../lib/marketing/navigation-state";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("marketing route matching is exact for home and nested for section routes", () => {
  assert.equal(isMarketingRouteActive("/", "/"), true);
  assert.equal(isMarketingRouteActive("/features", "/"), false);
  assert.equal(isMarketingRouteActive("/features", "/features"), true);
  assert.equal(isMarketingRouteActive("/features/advanced", "/features"), true);
  assert.equal(isMarketingRouteActive("/feature", "/features"), false);
  assert.equal(isMarketingRouteActive("/about/", "/about"), true);
  assert.equal(isMarketingRouteActive("/pricing?plan=pro", "/pricing"), true);
});

test("marketing header and footer share route-aware navigation without sparkles fallback", () => {
  const header = source("components/marketing/marketing-header.tsx");
  const footer = source("components/marketing/marketing-footer.tsx");

  assert.match(header, /MarketingNavLink/);
  assert.match(footer, /MarketingNavLink/);
  assert.match(footer, /getPublicMarketingFooterNavigation/);
  assert.doesNotMatch(header, /fallback="sparkles"/);
  assert.doesNotMatch(footer, /fallback="sparkles"/);
});
