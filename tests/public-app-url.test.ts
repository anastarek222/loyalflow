import assert from "node:assert/strict";
import test from "node:test";

import {
  getConfiguredPublicAppUrl,
  isPlaceholderAppHostname,
  validatePublicAppOrigin,
} from "../lib/public-app-url";

test("accepts real HTTPS application origins", () => {
  assert.equal(
    validatePublicAppOrigin("https://loyalflow.co", {
      production: true,
    }),
    "https://loyalflow.co",
  );

  assert.equal(
    validatePublicAppOrigin("https://app.loyalflow.co", {
      production: true,
    }),
    "https://app.loyalflow.co",
  );
});

test("rejects reserved and placeholder application domains", () => {
  const invalid = [
    "https://example.com",
    "https://app.example.com",
    "https://example.net",
    "https://demo.example.org",
    "https://app.example.test",
    "https://replace.invalid",
    "https://tenant.example",
  ];

  for (const value of invalid) {
    assert.throws(
      () =>
        validatePublicAppOrigin(value, {
          production: true,
        }),
      /placeholder|reserved/i,
    );
  }
});

test("rejects malformed canonical origins", () => {
  const invalid = [
    "https://loyalflow.co/",
    "https://loyalflow.co/path",
    "https://loyalflow.co?preview=true",
    "https://loyalflow.co#section",
    "https://user:password@loyalflow.co",
  ];

  for (const value of invalid) {
    assert.throws(() =>
      validatePublicAppOrigin(value, {
        production: true,
      }),
    );
  }
});

test("allows local HTTP only outside production", () => {
  assert.equal(
    validatePublicAppOrigin("http://localhost:3000"),
    "http://localhost:3000",
  );

  assert.throws(
    () =>
      validatePublicAppOrigin("http://localhost:3000", {
        production: true,
      }),
    /non-local HTTPS/i,
  );
});

test("configured production URL uses the same validation contract", () => {
  assert.equal(
    getConfiguredPublicAppUrl({
      NODE_ENV: "production",
      NEXT_PUBLIC_APP_URL: "https://app.loyalflow.co",
    }),
    "https://app.loyalflow.co",
  );

  assert.throws(() =>
    getConfiguredPublicAppUrl({
      NODE_ENV: "production",
      NEXT_PUBLIC_APP_URL: "https://app.example.com",
    }),
  );
});

test("placeholder hostname detection covers subdomains", () => {
  assert.equal(isPlaceholderAppHostname("example.com"), true);
  assert.equal(isPlaceholderAppHostname("app.example.com"), true);
  assert.equal(isPlaceholderAppHostname("app.example.test"), true);
  assert.equal(isPlaceholderAppHostname("app.loyalflow.co"), false);
});
