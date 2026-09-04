import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { PrismaPg } from "@prisma/adapter-pg";
import { expect, test } from "@playwright/test";

import { PrismaClient } from "@/generated/prisma/client";
import { createOwnerInvitationToken } from "@/lib/auth/owner-invitation";
import { TRIAL_DURATION_MS } from "@loyalflow/domain/billing/trial-core";

import { cleanupBrowserUat } from "./fixtures";

type InvitationState = {
  id: string;
  token: string;
  email: string;
  runId: string;
  businessName: string;
  businessSlug: string;
};

async function withDisposableDatabase<T>(
  operation: (prisma: PrismaClient) => Promise<T>,
): Promise<T> {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for owner invitation browser UAT.");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const identity = await prisma.$queryRaw<Array<{ database: string }>>`
      SELECT current_database() AS database
    `;
    const database = identity[0]?.database;
    if (database !== "loyalflow_ci" && database !== "loyalflow_test") {
      throw new Error(
        `Refusing owner invitation browser UAT outside a disposable database: ${database ?? "unknown"}`,
      );
    }

    return await operation(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

function createInvitationState(): InvitationState {
  const runId = randomUUID().replaceAll("-", "").slice(0, 10);
  const generated = createOwnerInvitationToken();

  return {
    id: generated.id,
    token: generated.token,
    email: `lf-uat-final-pending-owner-${runId}@example.test`,
    runId,
    businessName: `LoyalFlow final UAT O ${runId}`,
    businessSlug: `loyalflow-final-uat-o-${runId}`,
  };
}

async function seedOwnerInvitation(state: InvitationState) {
  const generated = createOwnerInvitationToken();
  const tokenHash = generated.token === state.token
    ? generated.tokenHash
    : undefined;

  // The invitation token itself must never be persisted. Derive the hash from
  // the exact browser token by using the same production helper indirectly via
  // a fresh token only when the generated values match is intentionally not
  // acceptable; seed the exact state below from the production token helper.
  if (tokenHash) {
    throw new Error("Unexpected invitation token collision.");
  }

  const { hashOwnerInvitationToken } = await import("@/lib/auth/owner-invitation");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await withDisposableDatabase(async (prisma) => {
    await prisma.$executeRaw`
      INSERT INTO "OwnerInvitation" (
        "id", "firstName", "lastName", "email", "tokenHash", "expiresAt", "usedAt", "createdAt"
      ) VALUES (
        ${state.id},
        ${"Pilot"},
        ${"Owner"},
        ${state.email},
        ${hashOwnerInvitationToken(state.token)},
        ${expiresAt},
        ${null},
        CURRENT_TIMESTAMP
      )
    `;
  });
}

async function deleteOwnerInvitation(invitationId: string) {
  await withDisposableDatabase(async (prisma) => {
    await prisma.$executeRaw`
      DELETE FROM "OwnerInvitation"
      WHERE "id" = ${invitationId}
    `;
  });
}

test.describe.serial(
  "Owner invitation redemption to persisted trial @owner-onboarding",
  () => {
    test.skip(
      Boolean(process.env.STAGING_UAT_MANIFEST_PATH?.trim()),
      "Token redemption mutates only the disposable PR database, never shared remote staging.",
    );

    const state = createInvitationState();
    const cleanupManifestPath = join(
      tmpdir(),
      `loyalflow-owner-invitation-${state.runId}.json`,
    );

    test.beforeAll(async () => {
      await seedOwnerInvitation(state);
    });

    test.afterAll(async () => {
      try {
        await cleanupBrowserUat(state.runId, cleanupManifestPath);
      } finally {
        await deleteOwnerInvitation(state.id);
      }
    });

    test("secure token redemption creates the pending Owner, launches one Business, and persists the exact seven-day trial", async ({
      page,
    }) => {
      test.setTimeout(150_000);

      const password = process.env.UAT_FIXTURE_PASSWORD;
      if (!password || password.length < 10) {
        throw new Error("UAT_FIXTURE_PASSWORD is required for owner invitation browser UAT.");
      }

      const invitationPath = `/accept-owner-invitation?token=${encodeURIComponent(state.token)}`;
      await page.goto(invitationPath);
      await page.locator("#password").fill(password);
      await page.locator("#confirmPassword").fill(password);
      await page.locator('button[type="submit"]').click();
      await expect(page).toHaveURL(/\/login\?invitation=accepted$/);

      const usedAt = await withDisposableDatabase(async (prisma) => {
        const rows = await prisma.$queryRaw<Array<{ usedAt: Date | null }>>`
          SELECT "usedAt"
          FROM "OwnerInvitation"
          WHERE "id" = ${state.id}
          LIMIT 1
        `;
        return rows[0]?.usedAt ?? null;
      });
      expect(usedAt).not.toBeNull();

      // Replay the exact token through the public surface. It must fail closed
      // after the first successful atomic redemption.
      await page.goto(invitationPath);
      await page.locator("#password").fill(password);
      await page.locator("#confirmPassword").fill(password);
      await page.locator('button[type="submit"]').click();
      await expect(page).toHaveURL(/\/accept-owner-invitation\?error=invalid-token$/);

      await page.goto("/login");
      await page.getByLabel("Email address").fill(state.email);
      await page.getByLabel("Password").fill(password);
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await expect(page).toHaveURL(/\/onboarding$/, { timeout: 20_000 });

      const form = page.locator("form[data-owner-step]");
      await expect(form).toHaveAttribute("data-owner-step", "1");
      await page.getByPlaceholder("Business name").fill(state.businessName);

      const country = page.getByRole("combobox", { name: "Country" });
      await country.fill("EG");
      await expect(
        page.locator('input[type="hidden"][name="country"]'),
      ).toHaveValue("Egypt");

      await page.getByRole("button", { name: "Next", exact: true }).click();
      await expect(form).toHaveAttribute("data-owner-step", "2");

      for (const step of [3, 4, 5, 6]) {
        await page.getByRole("button", { name: "Next", exact: true }).click();
        await expect(form).toHaveAttribute("data-owner-step", String(step));
      }

      await page.getByRole("button", { name: "Launch", exact: true }).click();
      await expect(page).toHaveURL(
        new RegExp(`/businesses/${state.businessSlug}(?:\\?.*)?$`),
        { timeout: 30_000 },
      );

      const persisted = await withDisposableDatabase(async (prisma) => {
        const businesses = await prisma.$queryRaw<
          Array<{
            id: string;
            trialStartedAt: Date | null;
            trialEndsAt: Date | null;
          }>
        >`
          SELECT "id", "trialStartedAt", "trialEndsAt"
          FROM "Business"
          WHERE "slug" = ${state.businessSlug}
          LIMIT 1
        `;
        const owners = await prisma.$queryRaw<
          Array<{
            businessId: string | null;
            onboardingStatus: string;
          }>
        >`
          SELECT "businessId", "onboardingStatus"
          FROM "User"
          WHERE "email" = ${state.email}
          LIMIT 1
        `;

        return {
          business: businesses[0] ?? null,
          owner: owners[0] ?? null,
        };
      });

      expect(persisted.business).not.toBeNull();
      expect(persisted.owner).not.toBeNull();
      expect(persisted.business?.trialStartedAt).not.toBeNull();
      expect(persisted.business?.trialEndsAt).not.toBeNull();
      expect(persisted.owner?.businessId).toBe(persisted.business?.id);
      expect(persisted.owner?.onboardingStatus).toBe("COMPLETE");

      expect(persisted.business?.trialStartedAt?.getTime()).toBe(
        usedAt?.getTime(),
      );
      expect(
        (persisted.business?.trialEndsAt?.getTime() ?? 0) -
          (persisted.business?.trialStartedAt?.getTime() ?? 0),
      ).toBe(TRIAL_DURATION_MS);
    });
  },
);
