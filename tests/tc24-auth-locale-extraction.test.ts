import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { authMessages } from "@loyalflow/i18n/auth";
import { messages, translate } from "@/lib/i18n/catalog";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("TC2.4 keeps separately sourced auth locale keys in parity", () => {
  assert.deepEqual(
    Object.keys(authMessages.ar).sort(),
    Object.keys(authMessages.en).sort(),
  );
  assert.equal(Object.keys(authMessages.en).length, 34);
});

test("TC2.4 compatibility catalog retains every existing auth value", () => {
  for (const key of Object.keys(authMessages.en)) {
    const messageKey = key as keyof typeof authMessages.en;
    assert.equal(messages.en[messageKey], authMessages.en[messageKey]);
    assert.equal(messages.ar[messageKey], authMessages.ar[messageKey]);
    assert.equal(translate("en", messageKey), authMessages.en[messageKey]);
    assert.equal(translate("ar", messageKey), authMessages.ar[messageKey]);
  }
});

test("TC2.4 legacy catalog adapts auth copy without owning a second source", () => {
  const catalog = source("lib/i18n/catalog.ts");
  assert.match(
    catalog,
    /import \{ authMessages \} from "@loyalflow\/i18n\/auth"/,
  );
  assert.match(catalog, /\.\.\.authMessages\.en/);
  assert.match(catalog, /\.\.\.authMessages\.ar/);
  assert.doesNotMatch(catalog, /"auth\.[A-Za-z]+"\s*:/);
});
