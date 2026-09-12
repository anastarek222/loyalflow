import { expect, test, type Page } from "@playwright/test";

import {
  cleanupBrowserUat,
  prepareBrowserUat,
  type BrowserUatFixture,
  uatEmail,
} from "./fixtures";

let fixture: BrowserUatFixture;
let manifestPath: string;

async function openPreviewPath(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  if (new URL(page.url()).hostname === "vercel.com") {
    throw new Error("Vercel automation bypass did not authorize the candidate Preview.");
  }
  return response;
}

async function signIn(
  page: Page,
  role: "owner-a" | "manager-a" | "staff-a" | "viewer-a",
) {
  await openPreviewPath(page, "/login");
  await page.getByLabel("Email address", { exact: true }).fill(uatEmail(role, fixture.runId));
  await page.getByLabel("Password", { exact: true }).fill(process.env.UAT_FIXTURE_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/businesses/${fixture.businessA}$`), {
    timeout: 45_000,
  });
}

test.describe.serial("WhatsApp V1 authenticated Staging UAT", () => {
  test.beforeAll(async ({ baseURL }) => {
    const prepared = await prepareBrowserUat(baseURL!);
    fixture = prepared.fixture;
    manifestPath = prepared.manifestPath;
  });

  test.afterAll(async () => {
    if (fixture && manifestPath) {
      await cleanupBrowserUat(fixture.runId, manifestPath);
    }
  });

  test("Seeded Staging fixture is visible through the exact Preview @desktop", async ({ page }) => {
    const response = await openPreviewPath(
      page,
      `/card/${encodeURIComponent(fixture.activeCustomer.publicToken)}`,
    );
    expect(response?.status(), "Preview must read the same Staging fixture database").toBe(200);
    await expect(page.getByText("Business A VISITS", { exact: false })).toBeVisible();
  });

  test("Owner sees six V1 automation events and saved copy persists @desktop", async ({ page }) => {
    await signIn(page, "owner-a");
    await page.goto(`/businesses/${fixture.businessA}/settings/whatsapp`);
    await expect(page.getByRole("heading", { name: "WhatsApp", exact: true })).toBeVisible();

    for (const event of [
      "WELCOME",
      "BALANCE_UPDATED",
      "REWARD_READY",
      "REWARD_REDEEMED",
      "NEW_REWARD",
      "NEW_OFFER",
    ]) {
      await expect(page.locator(`[data-whatsapp-automation-event="${event}"]`)).toHaveCount(1);
      await expect(page.locator(`[data-whatsapp-automation-event="${event}"]`)).toHaveAttribute(
        "data-whatsapp-producer-ready",
        "true",
      );
    }

    const globalPause = page.getByLabel("Global Pause");
    await globalPause.check();

    const copies = {
      WELCOME: "Welcome {customer} to {business}.",
      BALANCE_UPDATED: "Hi {customer}, your balance is {balance} {unit}.",
      REWARD_READY: "{customer}, your reward {reward} is ready.",
      REWARD_REDEEMED: "{customer}, reward {reward} was redeemed.",
      NEW_REWARD: "New reward from {business}: {reward}.",
      NEW_OFFER: "New offer from {business}.",
    } as const;

    for (const [event, value] of Object.entries(copies)) {
      const row = page.locator(`[data-whatsapp-automation-event="${event}"]`);
      await row.locator("textarea").fill(value);
      await row.locator('input[type="checkbox"]').check();
    }

    await page.getByRole("button", { name: "Save WhatsApp automations" }).click();
    await expect(page).toHaveURL(/whatsappAutomation=saved/);
    await expect(page.getByText("Automation settings were saved without deleting copy for disabled events.")).toBeVisible();

    await page.reload();
    await expect(page.getByText("Global Pause is on.")).toBeVisible();
    for (const [event, value] of Object.entries(copies)) {
      await expect(
        page.locator(`[data-whatsapp-automation-event="${event}"] textarea`),
      ).toHaveValue(value);
    }
  });

  test("Owner WhatsApp settings are functional on mobile @mobile", async ({ page }) => {
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
