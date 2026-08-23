import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

const shell = [
  "components/authenticated-app-shell.tsx",
  "components/app-sidebar.tsx",
  "components/app-topbar.tsx",
  "components/mobile-bottom-navigation.tsx",
]
  .map(source)
  .join("\n");
const dashboard = source("app/dashboard/page.tsx");
const businessDashboard = source("app/businesses/[slug]/page.tsx");

test("T006 dashboard shell uses the shared product identity across desktop and mobile", () => {
  assert.match(shell, /lf-app-shell/);
  assert.match(shell, /lf-brand-mark/);
  assert.match(shell, /lf-nav-item-active/);
  assert.match(shell, /lf-mobile-nav/);
  assert.match(
    source("components/page-layout/page-header.tsx"),
    /lf-page-header/,
  );
  assert.match(source("components/page-layout/stat.tsx"), /lf-type-numeric/);
});

test("T006 dashboard presentation preserves the existing permission and experience boundaries", () => {
  assert.match(
    businessDashboard,
    /canPerform\(user, business\.id, "LOYALTY_EARN"\)/,
  );
  assert.match(businessDashboard, /data-experience-dashboard="simple"/);
  assert.match(businessDashboard, /data-experience-mode=\{experienceMode\}/);
  assert.match(businessDashboard, /scanAction \?/);
  assert.match(businessDashboard, /trigger="shell"/);
  assert.doesNotMatch(businessDashboard, /Bell|notifications=1/);
});

test("T006 dashboard UI adds no client-side persistence or alternate data path", () => {
  const presentation = `${shell}\n${source("components/page-layout/page-header.tsx")}\n${source("components/page-layout/stat.tsx")}`;
  assert.doesNotMatch(
    presentation,
    /prisma\.|fetch\(|from "@\/generated\/prisma/,
  );
  assert.match(dashboard, /getGlobalDashboardMode\(businesses\.length\)/);
  assert.doesNotMatch(dashboard, /prisma\.user\.update\(/);
  assert.doesNotMatch(businessDashboard, /prisma\.user\.update\(/);
});
