import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");
const feedback = source("components/scan-success-feedback.tsx");
const scanPage = source(
  "app/businesses/[slug]/scan/customer/[customerId]/page.tsx",
);
const scanCopy = source("lib/scan/copy.ts");
const styles = source("app/globals.css");

test("Staff success feedback is attached only to the confirmed success state", () => {
  assert.match(
    scanPage,
    /successMessage \? \([\s\S]*?<ScanSuccessFeedback[\s\S]*?<nav/,
  );
  assert.match(scanPage, /role="status"/);
  assert.match(scanPage, /copy\.updatedBalance/);
  assert.doesNotMatch(feedback, /fetch\(|axios|prisma|ServerAction/);
});

test("Sound and haptics require an explicit, versioned local preference", () => {
  assert.match(feedback, /loyalflow:scan-success-feedback:v1/);
  assert.match(feedback, /return parsed\.enabled === true/);
  assert.match(feedback, /onClick=\{toggleFeedback\}/);
  assert.match(feedback, /if \(nextEnabled\) playFeedback\(\)/);
  assert.match(feedback, /window\.AudioContext/);
  assert.match(feedback, /"vibrate" in navigator/);
  assert.match(feedback, /aria-pressed=\{enabled\}/);
});

test("Feedback remains accessible, localized, and reduced-motion safe", () => {
  assert.match(feedback, /aria-live="polite"/);
  assert.match(feedback, /prefers-reduced-motion: reduce/);
  assert.match(styles, /@keyframes lf-scan-success-reveal/);
  assert.match(styles, /@keyframes lf-scan-success-mark/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);

  for (const language of ["AR", "EN"]) {
    assert.match(
      scanCopy,
      new RegExp(
        `${language}: \\{[\\s\\S]*?enableSuccessFeedback:[\\s\\S]*?successFeedbackDisabled:`,
      ),
    );
  }
});
