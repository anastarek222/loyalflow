import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { getPublicSocialLinks } from "../lib/marketing/public-social-links";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

test("public social profiles stay hidden until explicitly configured", () => {
  assert.deepEqual(getPublicSocialLinks({}), []);
});

test("public social profiles accept only matching HTTPS provider URLs", () => {
  assert.deepEqual(
    getPublicSocialLinks({
      NEXT_PUBLIC_SOCIAL_INSTAGRAM: " https://www.instagram.com/loyalflow/ ",
      NEXT_PUBLIC_SOCIAL_FACEBOOK: "https://facebook.com/loyalflow",
      NEXT_PUBLIC_SOCIAL_LINKEDIN: "https://www.linkedin.com/company/loyalflow/",
      NEXT_PUBLIC_SOCIAL_TIKTOK: "https://www.tiktok.com/@loyalflow",
      NEXT_PUBLIC_SOCIAL_YOUTUBE: "https://youtube.com/@loyalflow#videos",
    }),
    [
      {
        kind: "instagram",
        label: "Instagram",
        href: "https://www.instagram.com/loyalflow/",
      },
      {
        kind: "facebook",
        label: "Facebook",
        href: "https://facebook.com/loyalflow",
      },
      {
        kind: "linkedin",
        label: "LinkedIn",
        href: "https://www.linkedin.com/company/loyalflow/",
      },
      {
        kind: "tiktok",
        label: "TikTok",
        href: "https://www.tiktok.com/@loyalflow",
      },
      {
        kind: "youtube",
        label: "YouTube",
        href: "https://youtube.com/@loyalflow",
      },
    ],
  );
});

test("invalid, mismatched, or provider-home social URLs fail closed", () => {
  assert.deepEqual(
    getPublicSocialLinks({
      NEXT_PUBLIC_SOCIAL_INSTAGRAM: "http://instagram.com/loyalflow",
      NEXT_PUBLIC_SOCIAL_FACEBOOK: "https://example.com/loyalflow",
      NEXT_PUBLIC_SOCIAL_LINKEDIN: "https://linkedin.com/",
      NEXT_PUBLIC_SOCIAL_TIKTOK: "javascript:alert(1)",
      NEXT_PUBLIC_SOCIAL_YOUTUBE: "https://user:pass@youtube.com/@loyalflow",
    }),
    [],
  );
});

test("Marketing footer renders only the validated social authority", () => {
  const footer = source("components/marketing/marketing-footer.tsx");
  const env = source(".env.example");

  assert.match(footer, /getPublicSocialLinks\(\)/);
  assert.match(footer, /data-testid="marketing-social-links"/);
  assert.match(footer, /socialLinks\.length > 0/);
  assert.doesNotMatch(footer, /https:\/\/(?:www\.)?(?:instagram|facebook|linkedin|tiktok|youtube)\.com\//);

  for (const key of [
    "NEXT_PUBLIC_SOCIAL_INSTAGRAM",
    "NEXT_PUBLIC_SOCIAL_FACEBOOK",
    "NEXT_PUBLIC_SOCIAL_LINKEDIN",
    "NEXT_PUBLIC_SOCIAL_TIKTOK",
    "NEXT_PUBLIC_SOCIAL_YOUTUBE",
  ]) {
    assert.match(env, new RegExp(`^${key}=\\"\\"$`, "m"));
  }
});
