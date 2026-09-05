import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  createOwnerInvitationToken,
  hashOwnerInvitationToken,
  redeemOwnerInvitationWithStore,
} from "../lib/auth/owner-invitation";

const root = process.cwd();
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("owner invitation token is random, stored only as a hash, and expires", () => {
  const now = new Date("2026-08-09T00:00:00.000Z");
  const first = createOwnerInvitationToken(now);
  const second = createOwnerInvitationToken(now);

  assert.notEqual(first.token, second.token);
  assert.notEqual(first.tokenHash, first.token);
  assert.equal(first.tokenHash, hashOwnerInvitationToken(first.token));
  assert.equal(first.expiresAt.getTime() - now.getTime(), 24 * 60 * 60 * 1000);
});

test("redeeming a valid invitation consumes it exactly once and creates a pending owner", async () => {
  const now = new Date("2026-08-09T00:00:00.000Z");
  const generated = createOwnerInvitationToken(now);
  let invitation = {
    id: generated.id,
    firstName: "Mona",
    lastName: null,
    email: "mona@example.test",
    phone: null,
    businessName: null,
    country: null,
    source: "MANAGED" as const,
    tokenHash: generated.tokenHash,
    expiresAt: generated.expiresAt,
    usedAt: null as Date | null,
  };
  const users: Array<{ onboardingStatus: string; role: string; email: string }> = [];

  const store = {
    findInvitationByTokenHash: async (tokenHash: string) =>
      invitation.tokenHash === tokenHash ? invitation : null,
    findUserByEmail: async () => null,
    consumeAndCreateOwner: async (input: Parameters<Parameters<typeof redeemOwnerInvitationWithStore>[1]["consumeAndCreateOwner"]>[0]) => {
      if (
        invitation.id !== input.invitationId ||
        invitation.tokenHash !== input.expectedTokenHash ||
        invitation.usedAt !== null ||
        invitation.expiresAt <= input.now
      ) {
        return { status: "invalid_or_expired" as const };
      }

      invitation = { ...invitation, usedAt: input.now };
      users.push(input.owner);
      return { status: "success" as const, userId: "owner-1" };
    },
  };

  const first = await redeemOwnerInvitationWithStore(
    { token: generated.token, passwordHash: "hash", now },
    store,
  );
  const replay = await redeemOwnerInvitationWithStore(
    { token: generated.token, passwordHash: "hash", now },
    store,
  );

  assert.deepEqual(first, { status: "success", userId: "owner-1" });
  assert.deepEqual(replay, { status: "invalid_or_expired" });
  assert.equal(users.length, 1);
  assert.equal(users[0]?.role, "OWNER");
  assert.equal(users[0]?.onboardingStatus, "PENDING");
  assert.equal(users[0]?.email, "mona@example.test");
});

test("expired invitation cannot create an owner", async () => {
  const issuedAt = new Date("2026-08-09T00:00:00.000Z");
  const generated = createOwnerInvitationToken(issuedAt);
  let ownerCreated = false;

  const result = await redeemOwnerInvitationWithStore(
    {
      token: generated.token,
      passwordHash: "hash",
      now: new Date(generated.expiresAt.getTime() + 1),
    },
    {
      findInvitationByTokenHash: async () => ({
        id: generated.id,
        firstName: "Mona",
        lastName: null,
        email: "mona@example.test",
        phone: null,
        businessName: null,
        country: null,
        source: "MANAGED",
        tokenHash: generated.tokenHash,
        expiresAt: generated.expiresAt,
        usedAt: null,
      }),
      findUserByEmail: async () => null,
      consumeAndCreateOwner: async () => {
        ownerCreated = true;
        return { status: "success" as const, userId: "owner-invalid" };
      },
    },
  );

  assert.deepEqual(result, { status: "invalid_or_expired" });
  assert.equal(ownerCreated, false);
});

test("public trial redemption prefills normalized identity and business onboarding data", async () => {
  const now = new Date("2026-09-05T12:00:00.000Z");
  const generated = createOwnerInvitationToken(now);
  const createdOwners: Array<
    Parameters<
        Parameters<
          typeof redeemOwnerInvitationWithStore
        >[1]["consumeAndCreateOwner"]
      >[0]["owner"]
  > = [];

  await redeemOwnerInvitationWithStore(
    { token: generated.token, passwordHash: "hash", now },
    {
      findInvitationByTokenHash: async () => ({
        id: generated.id,
        firstName: "Mona",
        lastName: "Ali",
        email: "mona@example.test",
        phone: "+201001234567",
        businessName: "Mona Coffee",
        country: "Egypt",
        source: "PUBLIC_TRIAL",
        tokenHash: generated.tokenHash,
        expiresAt: generated.expiresAt,
        usedAt: null,
      }),
      findUserByEmail: async () => null,
      consumeAndCreateOwner: async (input) => {
        createdOwners.push(input.owner);
        return { status: "success", userId: "owner-public" };
      },
    },
  );

  assert.equal(createdOwners[0]?.phone, "+201001234567");
  assert.deepEqual(createdOwners[0]?.onboardingData, {
    name: "Mona Coffee",
    country: "Egypt",
  });
});

test("schema and migration persist only a hashed invitation token", () => {
  const schema = source("prisma/owner-invitation.prisma");
  const migration = source("prisma/migrations/20260809033000_add_owner_invitation_lifecycle/migration.sql");

  assert.match(schema, /email\s+String\s+@unique/);
  assert.match(schema, /tokenHash\s+String\s+@unique/);
  assert.doesNotMatch(schema, /^\s*token\s+String/m);
  assert.match(migration, /"tokenHash" TEXT NOT NULL/);
  assert.match(migration, /CREATE UNIQUE INDEX "OwnerInvitation_email_key"/);
  assert.doesNotMatch(migration, /"token" TEXT/);
});

test("invitation creation never creates an active owner directly", () => {
  const actions = source("app/businesses/actions.ts");
  const body = actions.match(/export async function createOwnerInvitationAction[\s\S]*?export async function createBusinessAction/)?.[0] ?? "";

  assert.doesNotMatch(body, /prisma\.user\.create/);
  assert.doesNotMatch(body, /ownerPassword/);
  assert.match(body, /OwnerInvitation/);
  assert.match(body, /sendOwnerInvitationEmail/);
});

test("legacy managed invitation action cannot recycle public or consumed reservations", () => {
  const actions = source("app/businesses/actions.ts");
  const body = actions.match(/export async function createOwnerInvitationAction[\s\S]*?export async function createBusinessAction/)?.[0] ?? "";

  assert.match(body, /\"source\" = 'MANAGED'::\"OwnerInvitationSource\"/);
  assert.match(body, /\"usedAt\" IS NULL/);
  assert.match(body, /RETURNING \"id\"/);
  assert.match(body, /persisted\.length !== 1/);
});

test("runtime redemption consumes and creates the pending owner inside one transaction", () => {
  const runtime = source("lib/auth/owner-invitation-runtime.ts");

  assert.match(runtime, /prisma\.\$transaction/);
  assert.match(runtime, /UPDATE "OwnerInvitation"/);
  assert.match(runtime, /"usedAt" IS NULL/);
  assert.match(runtime, /"expiresAt" > /);
  assert.match(runtime, /transaction\.user\.create/);
  assert.match(runtime, /passwordValueSchema\.safeParse/);
});
