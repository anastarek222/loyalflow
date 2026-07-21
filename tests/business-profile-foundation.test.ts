import assert from "node:assert/strict";
import test from "node:test";

import {
  createWithGeneratedSlug,
  getSlugCandidate,
  isSupportedCurrency,
  isValidBusinessPhone,
  isValidIanaTimezone,
  optionalProfileValue,
  slugifyBusinessName,
} from "@/lib/business-profile";

test("accepts supported ISO 4217 currency codes", () => {
  assert.equal(isSupportedCurrency("EGP"), true);
  assert.equal(isSupportedCurrency("USD"), true);
});

test("rejects unsupported currency codes", () => {
  assert.equal(isSupportedCurrency("XYZ"), false);
  assert.equal(isSupportedCurrency("egp"), false);
});

test("accepts valid IANA timezone identifiers", () => {
  assert.equal(isValidIanaTimezone("Africa/Cairo"), true);
  assert.equal(isValidIanaTimezone("America/New_York"), true);
});

test("rejects invalid timezone identifiers", () => {
  assert.equal(isValidIanaTimezone("Cairo/Egypt"), false);
});

test("keeps legacy currency and timezone values nullable", () => {
  assert.equal(optionalProfileValue(""), null);
  assert.equal(optionalProfileValue("  Africa/Cairo  "), "Africa/Cairo");
});

test("uses the canonical contactPhone validation for creation and settings", () => {
  assert.equal(isValidBusinessPhone("+201000000000"), true);
  assert.equal(isValidBusinessPhone("123"), false);
});

test("creates a deterministic URL-safe slug from a business name", () => {
  assert.equal(slugifyBusinessName("Loyal Flow"), "loyal-flow");
  assert.equal(slugifyBusinessName("Test Business"), "test-business");
});

test("uses a suffix for duplicate generated slug candidates", () => {
  assert.equal(getSlugCandidate("test-business", 1), "test-business-2");
});

test("does not require a caller-provided manual slug", async () => {
  const created = await createWithGeneratedSlug("Loyal Flow", async (slug) => ({
    slug,
  }));

  assert.equal(created.slug, "loyal-flow");
});

test("retries a unique collision without changing an existing slug", async () => {
  const attempted: string[] = [];
  const created = await createWithGeneratedSlug("Test Business", async (slug) => {
    attempted.push(slug);

    if (slug === "test-business") {
      throw { code: "P2002" };
    }

    return { slug };
  });

  assert.deepEqual(attempted, ["test-business", "test-business-2"]);
  assert.equal(created.slug, "test-business-2");
});

test("retries safely when concurrent creators observe the same initial collision", async () => {
  const occupied = new Set<string>();
  const create = async (slug: string) => {
    if (occupied.has(slug)) {
      throw { code: "P2002" };
    }

    occupied.add(slug);
    return slug;
  };

  const [first, second] = await Promise.all([
    createWithGeneratedSlug("Concurrent Business", create),
    createWithGeneratedSlug("Concurrent Business", create),
  ]);

  assert.deepEqual(new Set([first, second]), new Set([
    "concurrent-business",
    "concurrent-business-2",
  ]));
});
