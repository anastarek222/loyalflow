import { expect, test, type Page } from "@playwright/test";

import {
  cleanupBrowserUat,
  prepareBrowserUat,
  type BrowserUatFixture,
  uatEmail,
} from "./fixtures";

let fixture: BrowserUatFixture;
let manifestPath: string;

const shareUrl = process.env.VERCEL_SHARE_URL?.trim();

async function establishProtectedPreviewSession(page: Page) {
  if (!shareUrl) {
    throw new Error("VERCEL_SHARE_URL is required for protected Preview UAT.");
  }

  const share = new URL(shareUrl);
  if (!share.searchParams.get("_vercel_share")) {
    throw new Error("VERCEL_SHARE_URL is missing _vercel_share.");
  }

  // Vercel share access is a session bootstrap URL: open the exact URL first so
  // Vercel can redirect and set the deployment-access cookie. Only after that
  // cookie exists do we navigate to the actual UAT route without reusing the token.
  await page.goto(share.toString(), { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");

  const current = new URL(page.url());
  if (current.origin !== share.origin) {
    throw new Error(
      `Protected Preview share bootstrap did not resolve to the candidate deployment; received ${current.origin}.`,
    );
  }

  return share.origin;
}

async function openProtectedPath(page: Page, path: string) {
  const origin = await establishProtectedPreviewSession(page);
  const target = new URL(path, origin);
  const response = await page.goto(target.toString(), { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");

  const current = new URL(page.url());
  if (current.origin !== origin) {
    throw new Error(
      `Protected Preview session did not remain on the candidate deployment; received ${current.origin}.`,
    );
  }

  return response;
}

async function signIn(
  page: Page,
  role: "owner-a" | "manager-a" | "staff-a" | "viewer-a",
) {
  await openProtectedPath(page, "/login");
  await page.getByLabel("Email address", { exact: true }).fill(uatEmail(role, fixture.runId));
  await page.getByLabel("Password", { exact: true }).fill(process.env.UAT_FIXTURE_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/businesses/${fixture.businessA}$`), {
    timeout: 45_000,
  });
}

test.describe.serial("WhatsApp V1 authenticated Preview/Staging UAT v2", () => {
  test.beforeAll(async ({ baseURL }) => {
    const prepared = await prepareBrowserUat(baseURL!);
    fixture = prepared.fixture;
    manifestPath = prepared.manifestPath;
  });

  test.afterAll(async () => {
    if (fixture && manifestPath) await cleanupBrowserUat(fixture.runId, manifestPath);
  });

  test("exact Preview reads the seeded Staging fixture @desktop", async ({ page }) => {
    const response = await openProtectedPath(
      page,
      `/card/${encodeURIComponent(fixture.activeCustomer.publicToken)}`,
    );
    expect(response?.status(), "Preview must read the same isolated Staging DB").toBe(200);
    await expect(page.getByText("Business A VISITS", { exact: false })).toBeVisible();
  });

  test("Owner persists all six WhatsApp V1 events with Global Pause @desktop", async ({ page }) => {
    await signIn(page, "owner-a");
    await page.goto(`/businesses/${fixture.businessA}/settings/whatsapp`);
    await expect(page.getByRole("heading", { name: "WhatsApp", exact: true })).toBeVisible();

    const copies = {
      WELCOME: "Welcome {customer} to {business}.",
      BALANCE_UPDATED: "Hi {customer}, your balance is {balance} {unit}.",
      REWARD_READY: "{customer}, your reward {reward} is ready.",
      REWARD_REDEEMED: "{customer}, reward {reward} was redeemed.",
      NEW_REWARD: "New reward from {business}: {reward}.",
      NEW_OFFER: "New offer from {business}.",
    } as const;

    await page.getByLabel("Global Pause").check();
    for (const [event, value] of Object.entries(copies)) {
      const row = page.locator(`[data-whatsapp-automation-event="${event}"]`);
      await expect(row).toHaveCount(1);
      await expect(row).toHaveAttribute("data-whatsapp-producer-ready", "true");
      await row.locator("textarea").fill(value);
      await row.locator('input[type="checkbox"]').check();
    }

    await page.getByRole("button", { name: "Save WhatsApp automations" }).click();
    await expect(page).toHaveURL(/whatsappAutomation=saved/);
    await expect(page.getByText("Automation settings were saved without deleting copy for disabled events.")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Global Pause is on.")).toBeVisible();
    for (const [event, value] of Object.entries(copies)) {
      await expect(page.locator(`[data-whatsapp-automation-event="${event}"] textarea`)).toHaveValue(value);
    }
  });

  test("Owner sees New Reward and New Offer on mobile @mobile", async ({ page }) => {
    await signIn(page, "owner-a");
    await page.goto(`/businesses/${fixture.businessA}/settings/whatsapp`);
    await expect(page.getByRole("heading", { name: "WhatsApp", exact: true })).toBeVisible();
    await expect(page.locator('[data-whatsapp-automation-event="NEW_REWARD"]')).toBeVisible();
    await expect(page.locator('[data-whatsapp-automation-event="NEW_OFFER"]')).toBeVisible();
  });

  for (const role of ["manager-a", "staff-a", "viewer-a"] as const) {
    test(`${role} cannot manage WhatsApp settings @desktop`, async ({ page }) => {
      await signIn(page, role);
      await page.goto(`/businesses/${fixture.businessA}/settings/whatsapp`);
      await expect(page).not.toHaveURL(/\/settings\/whatsapp/);
    });
  }
});
