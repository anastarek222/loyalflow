import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), file), "utf8");

test("Final Product Reports keeps advanced presentation localized and semantic", () => {
  const page = read("app/businesses/[slug]/reports/page.tsx");
  const copy = read("lib/reports/presentation.ts");
  const navigation = read("components/reports/report-navigation.tsx");

  assert.doesNotMatch(page, /new Intl\.DateTimeFormat\("ar-EG"/);
  assert.match(
    page,
    /new Intl\.DateTimeFormat\(getLanguageLocale\(language\)/,
  );

  for (const binding of [
    "totalCustomers",
    "recentTransactions",
    "topCustomers",
    "system",
  ]) {
    assert.match(page, new RegExp(`copy\\.${binding}`));
  }

  assert.match(page, /dir=\{language === "AR" \? "rtl" : "ltr"\}/);
  assert.match(navigation, /bg-primary text-primary-foreground/);

  assert.match(copy, /totalCustomers: "إجمالي العملاء"/);
  assert.match(copy, /totalCustomers: "Total customers"/);
  assert.match(copy, /recentTransactions: "أحدث الحركات"/);
  assert.match(copy, /recentTransactions: "Recent transactions"/);
});
