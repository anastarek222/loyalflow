import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Contact uses the shared Tanee marketing shell and sales experience", () => {
  const page = source("app/contact/page.tsx");

  assert.match(page, /<MarketingHeader/);
  assert.match(page, /<ContactSalesExperience/);
  assert.match(page, /supportChannels=\{supportChannels\}/);
  assert.match(page, /<MarketingFooter/);
  assert.match(page, /canonical: "\/contact"/);
  assert.match(page, /contact-booking\.module\.css/);
  assert.match(page, /styles\.bookingExperience/);
});

test("meeting request UI supports the approved multi-provider preference set", () => {
  const experience = source(
    "components/marketing/contact-sales-experience.tsx",
  );
  const bookingLayout = source("app/contact/contact-booking.module.css");

  for (const method of [
    "phone",
    "whatsapp",
    "google-meet",
    "zoom",
    "teams",
    "ringcentral",
  ]) {
    assert.match(experience, new RegExp(`"${method}"`));
  }

  assert.match(experience, /preferredDate/);
  assert.match(experience, /preferredTime/);
  assert.match(experience, /resolvedOptions\(\)\.timeZone/);
  assert.match(experience, /meeting request, not an instant confirmation/);
  assert.match(
    bookingLayout,
    /#contact-options > div[\s\S]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/,
  );
  assert.match(
    bookingLayout,
    /#book-meeting fieldset > div[\s\S]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/,
  );
  assert.doesNotMatch(experience, /prisma|DATABASE_URL|api\/meetings/i);
});

test("shared Marketing header exposes a compact three-option Talk to an Expert launcher", () => {
  const header = source("components/marketing/marketing-header.tsx");
  const launcher = source("components/marketing/talk-to-expert-launcher.tsx");
  const launcherLayout = source(
    "components/marketing/talk-to-expert-launcher.module.css",
  );

  assert.match(header, /<TalkToExpertLauncher locale=\{locale\}/);
  assert.match(launcher, /\/contact#book-meeting/);
  assert.match(launcher, /\/contact#whatsapp/);
  assert.match(launcher, /\/contact#contact-options/);
  assert.match(launcher, /data-testid="talk-to-expert-trigger"/);
  assert.match(launcher, /data-testid="talk-to-expert-panel"/);
  assert.match(launcher, /data-testid="talk-to-expert-actions"/);
  assert.match(
    launcherLayout,
    /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/,
  );
});
