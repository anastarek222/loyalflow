import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { offerInputSchema } from "../lib/offers/catalog";
import { encodeOfferTagAudience } from "../lib/offers/eligibility";

const offerActions = readFileSync(
  "app/businesses/[slug]/offers/actions.ts",
  "utf8",
);
const offersPage = readFileSync(
  "app/businesses/[slug]/offers/page.tsx",
  "utf8",
);
const audienceContext = readFileSync(
  "lib/server/customers/audience-context.ts",
  "utf8",
);
const publicCard = readFileSync("app/card/[token]/page.tsx", "utf8");

test("offer input accepts encoded tag audiences but rejects arbitrary selectors", () => {
  assert.equal(
    offerInputSchema.safeParse({
      name: "VIP tag offer",
      eligibility: "SEGMENT",
      segment: encodeOfferTagAudience("tag-123"),
    }).success,
    true,
  );
  assert.equal(
    offerInputSchema.safeParse({
      name: "Unknown audience",
      eligibility: "SEGMENT",
      segment: "NOT_A_REAL_AUDIENCE",
    }).success,
    false,
  );
});

test("offer actions tenant-validate tag audiences before writes", () => {
  assert.match(offerActions, /canViewCustomerNotesTags\(/);
  assert.match(offerActions, /getOfferTagAudienceId\(input\.selector\)/);
  assert.match(
    offerActions,
    /prisma\.customerTag\.findFirst\(\{[\s\S]*?id: tagId,[\s\S]*?businessId: input\.businessId,/,
  );
  assert.match(offerActions, /hasValidOfferAudience\(/);
});

test("reactivating an offer revalidates its stored tag audience", () => {
  assert.match(
    offerActions,
    /select: \{ id: true, segment: true \}/,
  );
  assert.match(
    offerActions,
    /parsedStatus\.data &&[\s\S]*?hasValidOfferAudience\(\{[\s\S]*?selector: existingOffer\.segment \?\? undefined,/,
  );
});

test("offers workspace exposes only tenant-scoped tags as audience choices", () => {
  assert.match(offersPage, /canViewCustomerNotesTags\(/);
  assert.match(
    offersPage,
    /prisma\.customerTag\.findMany\(\{[\s\S]*?where: \{ businessId: business\.id \}/,
  );
  assert.match(offersPage, /encodeOfferTagAudience\(tag\.id\)/);
  assert.match(offersPage, /audienceTags=\{audienceTags\}/);
});

test("public offer matching resolves tag ids server-side without exposing CRM tag metadata", () => {
  assert.match(
    audienceContext,
    /prisma\.customerTagAssignment\.findMany\(\{[\s\S]*?businessId: input\.business\.id,[\s\S]*?customerId: input\.customer\.id,/,
  );
  assert.match(audienceContext, /customerTagIds: tagAssignments\.map/);
  assert.match(publicCard, /resolveBusinessCustomerAudienceContext\(/);
  assert.doesNotMatch(publicCard, /tagAssignments:\s*\{/);
  assert.doesNotMatch(publicCard, /notes:\s*\{/);
});
