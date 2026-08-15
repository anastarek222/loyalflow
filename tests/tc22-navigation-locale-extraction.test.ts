import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { navigationMessages } from "@loyalflow/i18n/navigation";
import {
  buildShellNavigation,
  getShellPageContext,
} from "@/lib/app-shell-navigation";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("TC2.2 navigation catalogs preserve complete AR/EN key parity", () => {
  assert.deepEqual(
    Object.keys(navigationMessages.ar).sort(),
    Object.keys(navigationMessages.en).sort(),
  );
  assert.equal(navigationMessages.en.platformOps, "Operations centre");
  assert.equal(navigationMessages.ar.platformOps, "مركز التشغيل");
});

test("TC2.2 shell consumes extracted copy without changing navigation behavior", () => {
  const user = { role: "SUPER_ADMIN" as const, businessId: null };
  const english = buildShellNavigation({ language: "EN", user });
  const arabic = buildShellNavigation({ language: "AR", user });

  assert.deepEqual(
    english
      .flatMap((group) => group.items)
      .map(({ id, href }) => ({ id, href })),
    arabic
      .flatMap((group) => group.items)
      .map(({ id, href }) => ({ id, href })),
  );
  assert.equal(english[0]?.label, navigationMessages.en.platformAdministration);
  assert.equal(arabic[0]?.label, navigationMessages.ar.platformAdministration);
  assert.equal(
    getShellPageContext("/businesses/acme/customers/customer-1", "AR", {
      id: "business-1",
      name: "Acme",
      slug: "acme",
    }).title,
    navigationMessages.ar.customerDetails,
  );

  const adapter = source("lib/app-shell-navigation.ts");
  assert.match(adapter, /@loyalflow\/i18n\/navigation/);
  assert.doesNotMatch(adapter, /const labels = \{\s*AR:/);
});
