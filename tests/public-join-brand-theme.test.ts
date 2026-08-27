import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { getCustomerExperienceTheme } from "@/lib/theme";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const base = {
  themePreset: "DEFAULT",
  cardStyle: "CLASSIC",
  fontFamily: "Inter",
};

test("Public Join theme preserves valid Business colours and safely falls back invalid or missing colours", () => {
  const valid = getCustomerExperienceTheme({
    ...base,
    primaryColor: "#12ab34",
    secondaryColor: "#eeddcc",
  });
  assert.equal(valid.primaryColor, "#12AB34");
  assert.equal(valid.secondaryColor, "#EEDDCC");

  const fallback = getCustomerExperienceTheme({
    ...base,
    primaryColor: "not-a-colour",
    secondaryColor: null,
  });
  assert.equal(fallback.primaryColor, "#111827");
  assert.equal(fallback.secondaryColor, "#FFFFFF");

  const shortHex = getCustomerExperienceTheme({
    ...base,
    primaryColor: "#fff",
    secondaryColor: "",
  });
  assert.equal(shortHex.primaryColor, "#111827");
  assert.equal(shortHex.secondaryColor, "#FFFFFF");
});

test("Public Join derives readable black or white foregrounds for rendered brand surfaces", () => {
  const dark = getCustomerExperienceTheme({
    ...base,
    primaryColor: "#000000",
    secondaryColor: "#111111",
  });
  assert.equal(dark.primaryForegroundColor, "#FFFFFF");
  assert.equal(dark.secondaryForegroundColor, "#FFFFFF");

  const light = getCustomerExperienceTheme({
    ...base,
    primaryColor: "#FFFFFF",
    secondaryColor: "#FDE047",
  });
  assert.equal(light.primaryForegroundColor, "#000000");
  assert.equal(light.secondaryForegroundColor, "#000000");

  const translucentMidtone = getCustomerExperienceTheme({
    ...base,
    primaryColor: "#111827",
    secondaryColor: "#555555",
  });
  assert.equal(
    translucentMidtone.secondaryForegroundColor,
    "#000000",
    "Reward contrast must use the rendered 80% secondary surface over white, not the raw secondary colour.",
  );
});

test("Public Join applies derived contrast to the brand header, reward surface and CTA", () => {
  const page = source("app/join/[slug]/page.tsx");
  const button = source("components/join-submit-button.tsx");

  assert.equal((page.match(/getCustomerExperienceTheme\(business\)/g) ?? []).length, 1);
  assert.match(page, /const headerForegroundColor = business\.coverImageUrl[\s\S]*?#FFFFFF[\s\S]*?theme\.primaryForegroundColor/);
  assert.match(page, /style=\{\{ color: headerForegroundColor \}\}/);
  assert.match(page, /backgroundColor: `\$\{theme\.secondaryColor\}CC`/);
  assert.match(page, /color: theme\.secondaryForegroundColor/);
  assert.match(page, /foregroundColor=\{theme\.primaryForegroundColor\}/);
  assert.doesNotMatch(page, /relative overflow-hidden px-5 py-6 text-white/);

  assert.match(button, /foregroundColor: string/);
  assert.match(button, /style=\{\{ backgroundColor: primaryColor, color: foregroundColor \}\}/);
  assert.doesNotMatch(button, /\btext-white\b/);
});
