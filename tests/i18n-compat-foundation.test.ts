import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { messages, translate, type MessageKey } from "../lib/i18n/catalog";
import {
  DEFAULT_LOCALE,
  getLocaleDirection,
  normalizeLocale,
  SUPPORTED_LOCALES,
} from "../lib/i18n/config";
import { LOCALE_COOKIE_NAME, resolveRequestLocale } from "../lib/i18n/request";

test("T005 supports exactly English and Arabic with English fallback", () => {
  assert.deepEqual(SUPPORTED_LOCALES, ["en", "ar"]);
  assert.equal(DEFAULT_LOCALE, "en");
  assert.equal(normalizeLocale(undefined), "en");
  assert.equal(normalizeLocale("fr"), "en");
  assert.equal(normalizeLocale("AR-eg"), "ar");
  assert.equal(normalizeLocale("en_US"), "en");
});

test("T005 maps locale direction deterministically", () => {
  assert.equal(getLocaleDirection("en"), "ltr");
  assert.equal(getLocaleDirection("ar"), "rtl");
});

test("T005 keeps Arabic and English catalog keys in parity", () => {
  const englishKeys = Object.keys(messages.en).sort();
  const arabicKeys = Object.keys(messages.ar).sort();

  assert.deepEqual(arabicKeys, englishKeys);
});

test("T005 resolves typed messages from the selected locale", () => {
  const key: MessageKey = "auth.signIn";

  assert.equal(translate("en", key), "Sign in");
  assert.equal(translate("ar", key), "تسجيل الدخول");
  assert.equal(translate("ar", "auth.email"), "البريد الإلكتروني");
  assert.equal(translate("en", "auth.forgotPassword"), "Forgot password?");
});

test("T005 resolves the SSR locale only from the bounded locale cookie", () => {
  assert.equal(LOCALE_COOKIE_NAME, "loyalflow_locale");
  assert.equal(resolveRequestLocale(undefined), "en");
  assert.equal(resolveRequestLocale("fr"), "en");
  assert.equal(resolveRequestLocale("ar"), "ar");
  assert.equal(resolveRequestLocale("AR-eg"), "ar");
});

test("T005 login entrypoint reads the locale cookie and renders locale-aware direction", async () => {
  const source = await readFile(new URL("../app/login/page.tsx", import.meta.url), "utf8");

  assert.match(source, /cookieStore\.get\(LOCALE_COOKIE_NAME\)/);
  assert.match(source, /const direction = getLocaleDirection\(locale\)/);
  assert.match(source, /<main lang=\{locale\} dir=\{direction\}/);
  assert.match(source, /<LanguageSwitcher locale=\{locale\} \/>/);
  assert.match(source, /translate\(locale, "auth\.signIn"\)/);
  assert.match(source, /translate\(locale, "auth\.email"\)/);
  assert.match(source, /translate\(locale, "auth\.password"\)/);
});

test("T005 language switcher persists only the bounded locale cookie and refreshes SSR", async () => {
  const source = await readFile(
    new URL("../components/i18n/language-switcher.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /document\.cookie = `\$\{LOCALE_COOKIE_NAME\}=\$\{nextLocale\}/);
  assert.match(source, /Path=\//);
  assert.match(source, /SameSite=Lax/);
  assert.match(source, /router\.refresh\(\)/);
  assert.match(source, /setLocale\("en"\)/);
  assert.match(source, /setLocale\("ar"\)/);
});
