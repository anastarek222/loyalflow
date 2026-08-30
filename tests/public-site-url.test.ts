import assert from "node:assert/strict";
import test from "node:test";

import { resolvePublicSiteUrl } from "../lib/urls/public-site-url";

const CURRENT_PRODUCTION_SITE = "https://loyalflow-gray.vercel.app";

test("public marketing origin keeps the current Production site as the fallback", () => {
  assert.equal(resolvePublicSiteUrl({}), CURRENT_PRODUCTION_SITE);
});

test("public marketing origin can be changed through dedicated configuration", () => {
  assert.equal(
    resolvePublicSiteUrl({
      NEXT_PUBLIC_SITE_URL: " https://www.loyalflow.com/ ",
    }),
    "https://www.loyalflow.com",
  );
});

test("Preview and runtime app origins never become the marketing canonical automatically", () => {
  assert.equal(
    resolvePublicSiteUrl({
      VERCEL_ENV: "preview",
      VERCEL_URL: "loyalflow-git-example.vercel.app",
      NEXT_PUBLIC_APP_URL: "https://loyalflow-git-example.vercel.app",
    }),
    CURRENT_PRODUCTION_SITE,
  );
});

test("invalid configured marketing origins fail instead of silently becoming canonical", () => {
  assert.throws(
    () => resolvePublicSiteUrl({ NEXT_PUBLIC_SITE_URL: "not-a-url" }),
    TypeError,
  );
});
