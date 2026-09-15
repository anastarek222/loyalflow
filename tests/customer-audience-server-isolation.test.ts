import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../lib/server/customers/audience-context.ts", import.meta.url),
  "utf8",
);

function sourceSection(start: string, end?: string) {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `missing source marker: ${start}`);

  if (!end) return source.slice(startIndex);

  const endIndex = source.indexOf(end, startIndex);
  assert.notEqual(endIndex, -1, `missing source marker: ${end}`);
  return source.slice(startIndex, endIndex);
}

test("audience context ledger reads are tenant-scoped", () => {
  const transactionQuery = sourceSection(
    "const transactions = await prisma.loyaltyTransaction.findMany",
    "const transactionsByCustomer",
  );

  assert.match(transactionQuery, /businessId:\s*input\.business\.id/);
  assert.match(transactionQuery, /customerId:\s*\{\s*in:\s*customerIds\s*\}/);
});

test("segment membership reads customers and rewards only from the requested tenant", () => {
  const segmentResolver = sourceSection(
    "export async function resolveBusinessCustomerIdsForSegment",
  );

  const customerQuery = sourceSectionWithin(
    segmentResolver,
    "prisma.customer.findMany",
    "prisma.reward.findMany",
  );
  const rewardQuery = sourceSectionWithin(
    segmentResolver,
    "prisma.reward.findMany",
    "]);",
  );

  assert.match(customerQuery, /where:\s*\{\s*businessId:\s*input\.business\.id\s*\}/);
  assert.match(rewardQuery, /where:\s*\{\s*businessId:\s*input\.business\.id,\s*isActive:\s*true\s*\}/);
});

function sourceSectionWithin(section: string, start: string, end: string) {
  const startIndex = section.indexOf(start);
  assert.notEqual(startIndex, -1, `missing section marker: ${start}`);
  const endIndex = section.indexOf(end, startIndex);
  assert.notEqual(endIndex, -1, `missing section marker: ${end}`);
  return section.slice(startIndex, endIndex);
}
