import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import robots from "../app/robots";
import sitemap from "../app/sitemap";
import { getPublicIndexingHeader } from "../lib/seo/public-page-metadata";
import { buildPublicSocialMetadata } from "../lib/seo/public-social-metadata";
import { buildPublicWebsiteStructuredData } from "../lib/seo/public-website-structured-data";
import {
  PUBLIC_SITE_URL,
  publicSiteUrl,
  resolvePublicSiteUrl,
} from "../lib/urls/public-site-url";

test("public canonical authority is isolated from preview/app origins", () => {
  assert.equal(
    resolvePublicSiteUrl({
      NEXT_PUBLIC_SITE_URL: "https://www.loyalflow.example/ignored/path?x=1#hash",
      NEXT_PUBLIC_APP_URL: "https://preview-123.vercel.app",
    }),
    "https://www.loyalflow.example",
  );

  assert.equal(
    resolvePublicSiteUrl({
      NEXT_PUBLIC_APP_URL: "https://preview-123.vercel.app",
    }),
    "https://loyalflow-gray.vercel.app",
  );
});

test("public page metadata uses absolute canonical, hreflang and Open Graph URLs", () => {
  const metadata = buildPublicSocialMetadata({
    title: "LoyalFlow",
    description: "Public marketing page",
    path: "/get-started",
    vercelEnvironment: "production",
  });
  const absoluteUrl = publicSiteUrl("/get-started");
  const openGraph = metadata.openGraph as { url?: string | URL } | null | undefined;

  assert.equal(String(metadata.alternates?.canonical), absoluteUrl);
  assert.deepEqual(metadata.alternates?.languages, {
    en: absoluteUrl,
    ar: absoluteUrl,
    "x-default": absoluteUrl,
  });
  assert.equal(String(openGraph?.url), absoluteUrl);
  assert.deepEqual(metadata.robots, { index: true, follow: true });
  assert.equal(JSON.stringify(metadata.twitter).includes('"/get-started"'), false);
});

test("public marketing pages fail closed to noindex outside Vercel Production", () => {
  for (const vercelEnvironment of ["preview", "development", undefined]) {
    const metadata = buildPublicSocialMetadata({
      title: "LoyalFlow",
      description: "Public marketing page",
      path: "/",
      vercelEnvironment,
    });

    assert.deepEqual(metadata.robots, { index: false, follow: false });
  }
});

test("Preview deployments emit an X-Robots-Tag noindex defense", () => {
  assert.deepEqual(getPublicIndexingHeader("preview"), {
    key: "X-Robots-Tag",
    value: "noindex, nofollow",
  });
  assert.equal(getPublicIndexingHeader("production"), null);
  assert.equal(getPublicIndexingHeader(undefined), null);

  const nextConfigSource = readFileSync("next.config.ts", "utf8");
  assert.match(nextConfigSource, /getPublicIndexingHeader\(process\.env\.VERCEL_ENV\)/);
});

test("marketing routes apply the centralized SEO policy after local defaults", () => {
  for (const pagePath of ["app/page.tsx", "app/get-started/page.tsx"]) {
    const source = readFileSync(pagePath, "utf8");
    const localRobotsOffset = source.indexOf("robots: { index: true, follow: true }");
    const policyOffset = source.indexOf("...buildPublicSocialMetadata");

    assert.notEqual(localRobotsOffset, -1);
    assert.ok(policyOffset > localRobotsOffset);
  }
});

test("robots and sitemap advertise only the canonical public-site authority", () => {
  const robotsRoute = robots();
  assert.equal(robotsRoute.host, PUBLIC_SITE_URL);
  assert.equal(robotsRoute.sitemap, publicSiteUrl("/sitemap.xml"));

  assert.deepEqual(
    sitemap().map((entry) => entry.url),
    [publicSiteUrl("/"), publicSiteUrl("/get-started")],
  );
});

test("public JSON-LD uses the same canonical authority", () => {
  const structuredData = buildPublicWebsiteStructuredData({
    description: "Public marketing page",
    locale: "en",
  });

  assert.equal(structuredData.url, PUBLIC_SITE_URL);
});
