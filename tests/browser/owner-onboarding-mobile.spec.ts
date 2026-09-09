import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";

import { PrismaPg } from "@prisma/adapter-pg";
import { expect, test } from "@playwright/test";

import { PrismaClient } from "@/generated/prisma/client";
import { generateTotpCode } from "@/lib/auth/super-admin-mfa";

import {
  cleanupBrowserUat,
  prepareBrowserUat,
  type BrowserUatFixture,
  uatEmail,
} from "./fixtures";
import { UAT_SUPER_ADMIN_MFA_SECRET } from "./fixture-mfa";

let fixture: BrowserUatFixture;
let manifestPath: string;
let authEmailSink: Server | null = null;

type CapturedAuthEmail = Readonly<{
  from: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
}>;

const capturedAuthEmails = new Map<string, CapturedAuthEmail>();

async function withDisposableFixtureDatabase(
  operation: (prisma: PrismaClient) => Promise<void>,
) {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for disposable browser UAT.");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  try {
    await operation(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

async function seedConsumedPendingOwnerInvitation(runId: string) {
  const usedAt = new Date();
  const expiresAt = new Date(usedAt.getTime() + 24 * 60 * 60 * 1000);
  const email = uatEmail("pending-owner", runId);

  await withDisposableFixtureDatabase(async (prisma) => {
    await prisma.$executeRaw`
      INSERT INTO "OwnerInvitation" (
        "id", "firstName", "lastName", "email", "tokenHash", "expiresAt", "usedAt", "createdAt"
      ) VALUES (
        ${randomUUID()},
        ${"Final UAT"},
        ${"Pending Owner"},
        ${email},
        ${`browser-uat-${randomUUID()}`},
        ${expiresAt},
        ${usedAt},
        CURRENT_TIMESTAMP
      )
    `;
  });
}

async function cleanupConsumedPendingOwnerInvitation(runId: string) {
  const pendingOwnerEmail = uatEmail("pending-owner", runId);
  const invitedOwnerEmail = uatEmail("invited-owner", runId);

  await withDisposableFixtureDatabase(async (prisma) => {
    await prisma.$executeRaw`
      DELETE FROM "OwnerInvitation"
      WHERE "email" IN (${pendingOwnerEmail}, ${invitedOwnerEmail})
    `;
  });
}

async function startAuthEmailSink() {
  if (
    process.env.CI !== "true" ||
    process.env.NODE_ENV !== "test" ||
    process.env.STAGING_UAT_MANIFEST_PATH?.trim()
  ) {
    return;
  }

  capturedAuthEmails.clear();
  authEmailSink = createServer(async (request, response) => {
    if (request.method !== "POST" || request.url !== "/emails") {
      response.writeHead(404).end();
      return;
    }

    try {
      let rawBody = "";
      for await (const chunk of request) rawBody += String(chunk);
      const parsed = JSON.parse(rawBody) as Partial<CapturedAuthEmail>;
      if (
        typeof parsed.from !== "string" ||
        !Array.isArray(parsed.to) ||
        parsed.to.some((value) => typeof value !== "string") ||
        typeof parsed.subject !== "string" ||
        typeof parsed.text !== "string" ||
        typeof parsed.html !== "string"
      ) {
        response.writeHead(400).end();
        return;
      }

      const captured: CapturedAuthEmail = {
        from: parsed.from,
        to: parsed.to,
        subject: parsed.subject,
        text: parsed.text,
        html: parsed.html,
      };
      for (const recipient of captured.to) {
        capturedAuthEmails.set(recipient.trim().toLowerCase(), captured);
      }

      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ id: `ci-auth-email-${randomUUID()}` }));
    } catch {
      response.writeHead(500).end();
    }
  });

  await new Promise<void>((resolve, reject) => {
    authEmailSink!.once("error", reject);
    authEmailSink!.listen(3198, "127.0.0.1", () => {
      authEmailSink!.off("error", reject);
      resolve();
    });
  });
}

async function stopAuthEmailSink() {
  if (!authEmailSink) return;
  const server = authEmailSink;
  authEmailSink = null;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function waitForCapturedAuthEmail(email: string) {
  const key = email.trim().toLowerCase();
  await expect
    .poll(() => capturedAuthEmails.has(key), { timeout: 20_000 })
    .toBe(true);
  return capturedAuthEmails.get(key)!;
}

function publicTrialPhone(runId: string) {
  return `+201${BigInt(`0x${runId}`).toString().padStart(9, "0").slice(-9)}`;
}

test.describe
  .serial("Owner onboarding mobile transition @owner-onboarding", () => {
  test.beforeAll(async ({ baseURL }) => {
    await startAuthEmailSink();
    const prepared = await prepareBrowserUat(baseURL!);
    fixture = prepared.fixture;
    manifestPath = prepared.manifestPath;

    if (!process.env.STAGING_UAT_MANIFEST_PATH?.trim()) {
      await seedConsumedPendingOwnerInvitation(fixture.runId);
    }
  });

  test.afterAll(async () => {
    try {
      if (fixture && manifestPath) {
        if (!process.env.STAGING_UAT_MANIFEST_PATH?.trim()) {
          await cleanupConsumedPendingOwnerInvitation(fixture.runId);
        }
        await cleanupBrowserUat(fixture.runId, manifestPath);
      }
    } finally {
      await stopAuthEmailSink();
    }
  });

  test("pending Owner completes setup, launches, and re-enters the one Business directly", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    await page.goto("/login");
    await page
      .getByLabel("Email address")
      .fill(uatEmail("pending-owner", fixture.runId));
    await page.getByLabel("Password").fill(process.env.UAT_FIXTURE_PASSWORD!);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/onboarding$/, { timeout: 20_000 });

    const form = page.locator("form[data-owner-step]");
    await expect(form).toHaveAttribute("data-owner-step", "1");
    await expect(form).toHaveAttribute("data-owner-hydrated", "true");

    const country = page.getByRole("combobox", { name: "Country" });
    await country.click();
    await expect(page.getByRole("listbox")).toBeVisible();
    await country.press("Escape");
    await expect(page.getByRole("listbox")).toHaveCount(0);

    await country.fill("EG");
    await expect(
      page.locator('input[type="hidden"][name="country"]'),
    ).toHaveValue("Egypt");
    await expect(page.getByRole("listbox")).toHaveCount(0);

    await page.getByPlaceholder("Business name").fill("");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Enter a business name" }),
    ).toBeVisible();
    await expect(form).toHaveAttribute("data-owner-step", "1");

    const businessName = `LoyalFlow final UAT O ${fixture.runId}`;
    const businessSlug = `loyalflow-final-uat-o-${fixture.runId}`;
    await page.getByPlaceholder("Business name").fill(businessName);
    await country.click();
    await expect(page.getByRole("listbox")).toBeVisible();
    await page.getByRole("button", { name: "Next", exact: true }).click();

    await expect(form).toHaveAttribute("data-owner-step", "2");
    const mobileHeading = page
      .getByTestId("owner-mobile-step-header")
      .getByRole("heading", { name: "Loyalty Program", exact: true });
    await expect(mobileHeading).toBeVisible();
    await expect(mobileHeading).toBeFocused();
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const heading = document.querySelector(
            '[data-testid="owner-mobile-step-header"] h1',
          );
          if (!heading) return false;
          const rect = heading.getBoundingClientRect();
          return rect.top >= 0 && rect.bottom <= window.innerHeight;
        }),
      )
      .toBe(true);

    // Remote exact-SHA UAT reuses one prepared manifest across Chromium and
    // WebKit. Keep that shared runtime check mutation-free; the disposable PR
    // database executes and cleans the complete launch receipt below.
    if (process.env.STAGING_UAT_MANIFEST_PATH?.trim()) return;

    for (const step of [3, 4, 5, 6]) {
      await page.getByRole("button", { name: "Next", exact: true }).click();
      await expect(form).toHaveAttribute("data-owner-step", String(step));
    }

    await page.getByRole("button", { name: "Launch", exact: true }).click();
    await expect(
      page,
    ).toHaveURL(new RegExp(`/businesses/${businessSlug}(?:\\?.*)?$`), {
      timeout: 30_000,
    });
    await expect(
      page.locator("#app-content").getByRole("heading", { level: 1 }),
    ).toHaveCount(1);

    await page
      .getByRole("button", { name: "Account menu", exact: true })
      .click();
    await Promise.all([
      page.waitForURL(/\/login$/),
      page.getByRole("button", { name: "Log out", exact: true }).click(),
    ]);

    await page
      .getByLabel("Email address")
      .fill(uatEmail("pending-owner", fixture.runId));
    await page.getByLabel("Password").fill(process.env.UAT_FIXTURE_PASSWORD!);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(new RegExp(`/businesses/${businessSlug}$`), {
      timeout: 20_000,
    });
    await expect(page).not.toHaveURL(/\/onboarding$/);
  });

  test("public Trial request sends a secure email link once and launches a persisted seven-day Trial", async ({
    page,
  }) => {
    test.setTimeout(150_000);
    test.skip(
      process.env.CI !== "true" ||
        process.env.NODE_ENV !== "test" ||
        Boolean(process.env.STAGING_UAT_MANIFEST_PATH?.trim()),
      "The request-to-email receipt runs only against the disposable CI database and loopback email sink.",
    );

    const ownerEmail = uatEmail("invited-owner", fixture.runId);
    const businessName = `LoyalFlow final UAT Invitation ${fixture.runId}`;
    const businessSlug = `loyalflow-final-uat-invitation-${fixture.runId}`;

    await page.goto("/get-started");
    await page.getByLabel("First name").fill("Public Trial");
    await page.getByLabel("Last name (optional)").fill("Owner");
    await page.getByLabel("Business name").fill(businessName);
    await page.getByLabel("Work email").fill(ownerEmail);

    const country = page.getByRole("combobox", { name: "Country" });
    await country.fill("EG");
    await expect(
      page.locator('input[type="hidden"][name="country"]'),
    ).toHaveValue("Egypt");
    await page.getByLabel("Phone number").fill(publicTrialPhone(fixture.runId));
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Start free trial" }).click();

    await expect(
      page.locator('[data-public-trial-state="submitted"]'),
    ).toBeVisible({ timeout: 20_000 });

    const deliveredEmail = await waitForCapturedAuthEmail(ownerEmail);
    expect(deliveredEmail.from).toBe("Tanee <noreply@gettanee.com>");
    expect(deliveredEmail.subject).toBe("Complete your Tanee business setup");
    expect(deliveredEmail.text).toContain("This secure link expires in 24 hours");
    expect(deliveredEmail.text).toContain("seven-day trial starts");

    const linkMatch = deliveredEmail.text.match(
      /https?:\/\/[^\s]+\/accept-owner-invitation\?token=[^\s]+/,
    );
    expect(linkMatch).not.toBeNull();
    const invitationUrl = new URL(linkMatch![0]);
    const secureInvitationPath = `${invitationUrl.pathname}${invitationUrl.search}`;
    expect(invitationUrl.pathname).toBe("/accept-owner-invitation");
    expect(invitationUrl.searchParams.get("token")?.length).toBeGreaterThanOrEqual(20);

    await page.goto(secureInvitationPath);
    await page
      .getByLabel("Password", { exact: true })
      .fill(process.env.UAT_FIXTURE_PASSWORD!);
    await page
      .getByLabel("Confirm password")
      .fill(process.env.UAT_FIXTURE_PASSWORD!);
    await page
      .getByRole("button", { name: "Continue setup", exact: true })
      .click();
    await expect(page).toHaveURL(/\/onboarding$/, {
      timeout: 20_000,
    });
    await expect(page.getByPlaceholder("Business name")).toHaveValue(businessName);

    // Replay the exact delivered token and prove redemption is single-use.
    await page.goto(secureInvitationPath);
    await page
      .getByLabel("Password", { exact: true })
      .fill(process.env.UAT_FIXTURE_PASSWORD!);
    await page
      .getByLabel("Confirm password")
      .fill(process.env.UAT_FIXTURE_PASSWORD!);
    await page
      .getByRole("button", { name: "Continue setup", exact: true })
      .click();
    await expect(page).toHaveURL(/\/accept-owner-invitation\?error=invalid-token$/, {
      timeout: 20_000,
    });

    // The accepted Owner session remains authoritative after a rejected token replay.
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/onboarding$/, { timeout: 20_000 });
    await expect(page.getByPlaceholder("Business name")).toHaveValue(businessName);

    for (const step of [2, 3, 4, 5, 6]) {
      await page.getByRole("button", { name: "Next", exact: true }).click();
      await expect(page.locator("form[data-owner-step]")).toHaveAttribute(
        "data-owner-step",
        String(step),
      );
    }

    await page.getByRole("button", { name: "Launch", exact: true }).click();
    await expect(
      page,
    ).toHaveURL(new RegExp(`/businesses/${businessSlug}(?:\\?.*)?$`), {
      timeout: 30_000,
    });

    await withDisposableFixtureDatabase(async (prisma) => {
      const invitation = await prisma.ownerInvitation.findUniqueOrThrow({
        where: { email: ownerEmail },
        select: { source: true, usedAt: true },
      });
      const business = await prisma.business.findUniqueOrThrow({
        where: { slug: businessSlug },
        select: {
          subscriptionLifecycleState: true,
          trialStartedAt: true,
          trialEndsAt: true,
        },
      });

      expect(invitation.source).toBe("PUBLIC_TRIAL");
      expect(invitation.usedAt).not.toBeNull();
      expect(business.subscriptionLifecycleState).toBe("TRIALING");
      expect(business.trialStartedAt).not.toBeNull();
      expect(business.trialEndsAt).not.toBeNull();
      expect(business.trialStartedAt!.getTime()).toBeGreaterThan(
        invitation.usedAt!.getTime(),
      );
      expect(
        business.trialEndsAt!.getTime() - business.trialStartedAt!.getTime(),
      ).toBe(7 * 24 * 60 * 60 * 1000);
    });
  });

  test("Super Admin provisions a complete Business and its Owner can enter directly", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    test.skip(
      Boolean(process.env.STAGING_UAT_MANIFEST_PATH?.trim()),
      "Business provisioning requires the disposable PR database.",
    );

    const businessName = `LoyalFlow final UAT SA ${fixture.runId}`;
    const businessSlug = `loyalflow-final-uat-sa-${fixture.runId}`;
    const ownerEmail = uatEmail("provisioned-owner", fixture.runId);

    await page.goto("/login");
    await page
      .getByLabel("Email address")
      .fill(uatEmail("superadmin", fixture.runId));
    await page.getByLabel("Password").fill(process.env.UAT_FIXTURE_PASSWORD!);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByTestId("login-mfa-step")).toBeVisible();
    await page
      .locator("#mfaCode")
      .fill(generateTotpCode(UAT_SUPER_ADMIN_MFA_SECRET));
    await page
      .getByTestId("login-mfa-step")
      .locator('button[type="submit"]')
      .click();
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 });

    await page.goto("/businesses/new");
    await page.getByPlaceholder("Business name").fill(businessName);
    await page.getByRole("button", { name: "Next", exact: true }).click();

    await page.getByPlaceholder("First name").fill("Provisioned");
    await page.getByPlaceholder("Owner email").fill(ownerEmail);
    await page
      .getByPlaceholder(/Password — minimum/)
      .fill(process.env.UAT_FIXTURE_PASSWORD!);

    for (let expectedStep = 2; expectedStep <= 5; expectedStep += 1) {
      await page.getByRole("button", { name: "Next", exact: true }).click();
      await expect(
        page.getByRole("button", {
          name: new RegExp(`^${expectedStep + 1}\\.`),
        }),
      ).toHaveAttribute("aria-current", "step");
    }

    await page
      .getByRole("button", { name: "Create business", exact: true })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/businesses/${businessSlug}/users(?:\\?.*)?$`),
      { timeout: 30_000 },
    );
    await expect(
      page.locator("#app-content").getByRole("heading", { level: 1 }),
    ).toHaveCount(1);

    await page
      .getByRole("button", { name: "Account menu", exact: true })
      .click();
    await Promise.all([
      page.waitForURL(/\/login$/),
      page.getByRole("button", { name: "Log out", exact: true }).click(),
    ]);

    await page.getByLabel("Email address").fill(ownerEmail);
    await page.getByLabel("Password").fill(process.env.UAT_FIXTURE_PASSWORD!);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(new RegExp(`/businesses/${businessSlug}$`), {
      timeout: 20_000,
    });
    await expect(page).not.toHaveURL(/\/onboarding$/);
  });
});
