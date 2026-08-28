import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path: string) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("customer operations keep the daily loyalty action visible and collapse secondary work independently", async () => {
  const [page, disclosure] = await Promise.all([
    source("app/businesses/[slug]/customers/[customerId]/page.tsx"),
    source("components/customer-profile/operational-disclosure.tsx"),
  ]);

  assert.match(page, /id="daily-loyalty"/);
  assert.match(page, /title=\{copy\.customerTags\}/);
  assert.match(page, /title=\{copy\.notes\}/);
  assert.match(page, /title=\{copy\.manageCustomer\}/);
  assert.match(page, /title=\{copy\.manualBalance\}/);
  assert.match(page, /title=\{copy\.accountStatus\}/);
  assert.match(page, /title=\{copy\.cardAndSharing\}/);
  assert.match(disclosure, /<details/);
  assert.match(disclosure, /<summary/);
  assert.match(disclosure, /group-open:rotate-180/);
  assert.match(disclosure, /open=\{defaultOpen \|\| undefined\}/);
});

test("customer activity is bounded to ten recent events with a filtered full-history destination", async () => {
  const [page, timeline] = await Promise.all([
    source("app/businesses/[slug]/customers/[customerId]/page.tsx"),
    source("components/customer-profile/activity-timeline.tsx"),
  ]);

  assert.equal((page.match(/take: 10/g) ?? []).length, 2);
  assert.match(page, /buildCustomerTimeline\([\s\S]*?\)\.slice\(0, 10\)/);
  assert.match(
    page,
    /canViewActivity[\s\S]*?`\/businesses\/\$\{business\.slug\}\/activity\?customer=\$\{customer\.id\}`/,
  );
  assert.match(page, /"REPORTS_VIEW"/);
  assert.match(timeline, /data-customer-activity-timeline/);
  assert.match(timeline, /labels\.viewAll/);
  assert.match(timeline, /viewAllHref \? \(/);
});

test("action feedback opens only its relevant operational section", async () => {
  const page = await source(
    "app/businesses/[slug]/customers/[customerId]/page.tsx",
  );

  assert.match(page, /query\.error === "tag-invalid"/);
  assert.match(page, /query\.error === "note-invalid"/);
  assert.match(page, /query\.error === "adjustment-invalid"/);
  assert.match(page, /query\.success === "deactivated"/);
  assert.match(page, /query\.success === "referral-link"/);
});
