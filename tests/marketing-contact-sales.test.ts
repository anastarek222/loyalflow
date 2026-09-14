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

test("meeting request UI enforces tomorrow-first Cairo booking with three methods", () => {
  const experience = source(
    "components/marketing/contact-sales-experience.tsx",
  );
  const bookingLayout = source("app/contact/contact-booking.module.css");

  for (const method of ["phone", "whatsapp", "google-meet"]) {
    assert.match(experience, new RegExp(`"${method}"`));
  }

  assert.doesNotMatch(
    experience,
    /const meetingMethodIds[\s\S]*"zoom"[\s\S]*"teams"[\s\S]*"ringcentral"/,
  );
  assert.match(experience, /BOOKING_TIME_ZONE = "Africa\/Cairo"/);
  assert.match(experience, /getBookingDateIso\(1\)/);
  assert.match(experience, /min=\{minimumBookingDate\}/);
  assert.match(experience, /defaultValue=\{minimumBookingDate\}/);
  assert.match(experience, /BOOKING_TIME_SLOTS/);
  assert.match(experience, /"15:00"/);
  assert.match(experience, /"00:00"/);
  assert.match(experience, /data-testid="meeting-date"/);
  assert.match(experience, /data-testid="meeting-time"/);
  assert.match(experience, /id="book-meeting"/);
  assert.match(experience, /tabIndex=\{-1\}/);
  assert.match(
    bookingLayout,
    /#contact-options > div[\s\S]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/,
  );
  assert.doesNotMatch(experience, /prisma|DATABASE_URL|api\/meetings/i);
});

test("shared Marketing header exposes smart mobile navigation and booking launcher", () => {
  const header = source("components/marketing/marketing-header.tsx");
  const launcher = source("components/marketing/talk-to-expert-launcher.tsx");
  const launcherLayout = source(
    "components/marketing/talk-to-expert-launcher.module.css",
  );

  assert.match(header, /data-header-visible=\{isHeaderVisible/);
  assert.match(header, /currentY > previousY \+ 4/);
  assert.match(header, /currentY < previousY - 2/);
  assert.match(header, /-translate-y-full/);
  assert.match(header, /xl:translate-y-0/);
  assert.match(header, /fixed inset-y-0 right-0/);
  assert.match(header, /text-\[var\(--lf-foreground-muted\)\]/);
  assert.match(header, /<TalkToExpertLauncher locale=\{locale\}/);

  assert.match(launcher, /\/contact#book-meeting/);
  assert.match(launcher, /\/contact#whatsapp/);
  assert.match(launcher, /\/contact#contact-options/);
  assert.match(launcher, /Book your meeting/);
  assert.match(launcher, /احجز اجتماعك/);
  assert.match(launcher, /data-testid="talk-to-expert-teaser"/);
  assert.match(launcher, /data-testid="talk-to-expert-trigger"/);
  assert.match(launcher, /data-testid="talk-to-expert-panel"/);
  assert.match(launcher, /data-testid="talk-to-expert-actions"/);
  assert.match(
    launcherLayout,
    /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/,
  );
});

test("shared marketing navigation and footer keep one brand contract", () => {
  const navigation = source("lib/marketing/public-navigation.ts");
  const footer = source("components/marketing/marketing-footer.tsx");

  assert.match(navigation, /About Tanee/);
  assert.match(navigation, /عن Tanee/);
  assert.match(footer, /dir="ltr"/);
  assert.match(footer, /<SocialBrandIcon kind=\{link\.kind\}/);
  assert.doesNotMatch(footer, /Camera|MessageCircle|Briefcase|Music2|Play/);
});
