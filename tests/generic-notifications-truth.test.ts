import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

const notifications = source("lib/notifications.ts");
const overview = source("app/businesses/[slug]/page.tsx");
const unreadSummary = source("lib/dashboard/business-unread-summary.ts");
const actions = source("app/businesses/[slug]/notification-actions.ts");
const readCommand = source("lib/server/business/notification-read-command.ts");
const readState = source("lib/notification-read-state.ts");

function stripComments(value: string) {
  return value
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}

function matchCount(value: string, pattern: RegExp) {
  return value.match(pattern)?.length ?? 0;
}

test("generic business notifications are explicitly an in-app persistence contract", () => {
  assert.match(notifications, /in-app persistence only/);
  assert.match(notifications, /businessId: input\.businessId/);
  assert.match(notifications, /userId: input\.userId/);

  const implementation = stripComments(
    notifications.slice(notifications.indexOf("export async function createBusinessNotification")),
  );
  assert.doesNotMatch(
    implementation,
    /fetch\(|axios|send(?:Email|Sms|WhatsApp|Push)|dispatch|enqueue|provider/i,
  );
});

test("business overview reads only current-tenant notifications visible to the current user", () => {
  const queryStart = overview.indexOf("prisma.notification.findMany({");
  const queryEnd = overview.indexOf("prisma.customer.count({", queryStart);
  assert.ok(queryStart >= 0 && queryEnd > queryStart);

  const recentNotificationQuery = overview.slice(queryStart, queryEnd);
  assert.match(recentNotificationQuery, /businessId: business\.id/);
  assert.match(
    recentNotificationQuery,
    /OR: \[\{ userId: null \}, \{ userId: user\.id \}\]/,
  );
});

test("unread aggregates scope every source and read marker to the current tenant", () => {
  assert.equal(
    matchCount(
      unreadSummary,
      /notification\."businessId" = \$\{input\.businessId\}/g,
    ),
    1,
  );
  assert.equal(
    matchCount(
      unreadSummary,
      /customer\."businessId" = \$\{input\.businessId\}/g,
    ),
    1,
  );
  assert.equal(
    matchCount(
      unreadSummary,
      /activity\."businessId" = \$\{input\.businessId\}/g,
    ),
    3,
  );
  assert.equal(
    matchCount(
      unreadSummary,
      /item_read\."businessId" = \$\{input\.businessId\}/g,
    ),
    5,
  );
  assert.match(
    unreadSummary,
    /notification\."userId" IS NULL OR notification\."userId" = \$\{input\.userId\}/,
  );
});

test("notification read writes require business access and authoritative tenant target validation", () => {
  assert.match(actions, /canAccessBusiness\(session\.user, business\.id\)/);
  assert.match(
    readCommand,
    /await assertTenantScopedNotificationReadTarget\(\{/,
  );
  assert.match(readCommand, /businessId: input\.businessId/);
  assert.match(readCommand, /userId: input\.userId/);
  assert.match(
    readState,
    /notification\.businessId !== input\.businessId/,
  );
  assert.match(
    readState,
    /notification\.userId !== null && notification\.userId !== input\.userId/,
  );
  assert.match(readState, /activity\.businessId !== input\.businessId/);
  assert.match(readState, /customer\.businessId !== input\.businessId/);
});

test("generic notification read-state stays isolated from delivery providers", () => {
  const core = stripComments(
    [notifications, unreadSummary, actions, readCommand, readState].join("\n"),
  );

  assert.doesNotMatch(
    core,
    /server\/integrations|whatsapp|meta|sms|email-delivery|push-provider|delivery-provider/i,
  );
});
