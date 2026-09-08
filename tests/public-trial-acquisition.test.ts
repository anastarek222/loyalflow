import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  createPublicTrialIdentityKey,
  parsePublicTrialInput,
} from "@/lib/acquisition/public-trial";

const root = process.cwd();
const source = (file: string) => readFileSync(path.join(root, file), "utf8");

test("public Trial input normalizes email and local phone under the selected country", () => {
  assert.deepEqual(
    parsePublicTrialInput({
      firstName: " Mona ",
      lastName: " Ali ",
      email: " Mona@Example.Test ",
      phone: "0100 123 4567",
      businessName: " Mona Coffee ",
      country: "Egypt",
      acceptTerms: "on",
    }),
    {
      firstName: "Mona",
      lastName: "Ali",
      email: "mona@example.test",
      phone: "+201001234567",
      businessName: "Mona Coffee",
      country: "Egypt",
    },
  );
});

test("public Trial rejects unknown countries, unsafe phones, and missing consent", () => {
  const base = {
    firstName: "Mona",
    lastName: "",
    email: "mona@example.test",
    phone: "01001234567",
    businessName: "Mona Coffee",
    country: "Egypt",
    acceptTerms: "on",
  };

  assert.equal(parsePublicTrialInput({ ...base, country: "Unknown" }), null);
  assert.equal(parsePublicTrialInput({ ...base, phone: "123" }), null);
  assert.equal(parsePublicTrialInput({ ...base, acceptTerms: undefined }), null);
});

test("public Trial limiter identity is deterministic and contains no raw identity", () => {
  const identity = {
    email: "mona@example.test",
    phone: "+201001234567",
  };
  const first = createPublicTrialIdentityKey(identity);
  const second = createPublicTrialIdentityKey(identity);

  assert.equal(first, second);
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.doesNotMatch(first, /mona|201001234567/);
});

test("public Trial persistence enforces one normalized email and phone identity", () => {
  const schema = source("prisma/owner-invitation.prisma");
  const migration = source(
    "prisma/migrations/20260905120000_add_public_trial_acquisition_identity/migration.sql",
  );

  assert.match(schema, /email\s+String\s+@unique/);
  assert.match(schema, /phone\s+String\?\s+@unique/);
  assert.match(schema, /PUBLIC_TRIAL/);
  assert.match(migration, /CREATE UNIQUE INDEX "OwnerInvitation_phone_key"/);
  assert.match(migration, /"source" "OwnerInvitationSource" NOT NULL/);
});

test("public Trial reservation is race-safe and returns neutral eligibility outcomes", () => {
  const action = source("app/get-started/actions.ts");

  assert.match(action, /ON CONFLICT DO NOTHING/);
  assert.match(action, /existingUser/);
  assert.match(action, /existing\.usedAt === null/);
  assert.match(action, /if \(!reserved\) return \{ status: "submitted" \}/);
  assert.match(action, /public-trial-address:/);
  assert.match(action, /public-trial-identity:/);
  assert.doesNotMatch(action, /return \{ status: "duplicate"/);
  assert.doesNotMatch(action, /return \{ status: "trial-used"/);
});

test("public Trial UI collects only the acquisition contract and exposes all safe states", () => {
  const form = source("components/public-trial-form.tsx");
  const page = source("app/get-started/page.tsx");

  for (const field of [
    "firstName",
    "lastName",
    "businessName",
    "email",
    "country",
    "phone",
    "acceptTerms",
  ]) {
    assert.match(form, new RegExp(`name=["']${field}["']`));
  }
  assert.match(form, /data-public-trial-state="submitted"/);
  assert.match(form, /"validation-error"/);
  assert.match(form, /"rate-limited"/);
  assert.match(form, /"service-unavailable"/);
  assert.match(page, /startPublicTrialAction/);
  assert.doesNotMatch(page, /href=["']\/accept-owner-invitation/);
});
