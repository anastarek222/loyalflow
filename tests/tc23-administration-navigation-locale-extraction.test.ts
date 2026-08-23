import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { navigationMessages } from "@loyalflow/i18n/navigation";
import { getAdministrationNavigation } from "@/lib/administration/navigation";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("TC2.3 administration copy is extracted without changing owner navigation", () => {
  const user = { role: "OWNER" as const, businessId: "business-a" };
  const english = getAdministrationNavigation(
    user,
    "business-a",
    "north-star",
    "EN",
  );
  const arabic = getAdministrationNavigation(
    user,
    "business-a",
    "north-star",
    "AR",
  );

  assert.deepEqual(
    english.map(({ id, href }) => ({ id, href })),
    arabic.map(({ id, href }) => ({ id, href })),
  );
  assert.equal(
    english[0]?.label,
    navigationMessages.en.administrationSettingsLabel,
  );
  assert.equal(
    arabic[0]?.label,
    navigationMessages.ar.administrationSettingsLabel,
  );
  assert.match(
    source("lib/administration/navigation.ts"),
    /@loyalflow\/i18n\/navigation/,
  );
  assert.doesNotMatch(
    source("lib/administration/navigation.ts"),
    /Business settings|إعدادات النشاط/,
  );
});

test("TC2.3 capability and tenant checks remain the navigation authority", () => {
  assert.deepEqual(
    getAdministrationNavigation(
      { role: "MANAGER", businessId: "business-a" },
      "business-a",
      "north-star",
      "EN",
    ),
    [],
  );
  assert.deepEqual(
    getAdministrationNavigation(
      { role: "OWNER", businessId: "business-b" },
      "business-a",
      "north-star",
      "EN",
    ),
    [],
  );
});
