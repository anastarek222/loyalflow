import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const staffReports = readFileSync(
  new URL("../app/businesses/[slug]/reports/staff/page.tsx", import.meta.url),
  "utf8",
);

test("Staff Reports keeps persisted attribution logic while using the final bilingual report shell", () => {
  assert.match(staffReports, /getCanonicalStaffAttribution\(transaction\)/);
  assert.match(staffReports, /getCanonicalStaffAttribution\(redemption\)/);
  assert.match(staffReports, /dir=\{language === "AR" \? "rtl" : "ltr"\}/);
  assert.match(staffReports, /data-staff-reports-workspace="true"/);
  assert.match(staffReports, /Staff performance filters/);
  assert.match(staffReports, /فلاتر أداء الفريق/);
  assert.match(staffReports, /bg-surface/);
  assert.match(staffReports, /text-foreground/);
  assert.match(staffReports, /border-border/);
  assert.doesNotMatch(staffReports, /bg-white/);
  assert.doesNotMatch(staffReports, /text-violet-/);
  assert.doesNotMatch(staffReports, /border-slate-/);
});
