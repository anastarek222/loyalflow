import { expect, test, type Page } from "@playwright/test";

import {
  cleanupBrowserUat,
  prepareBrowserUat,
  type BrowserUatFixture,
  uatEmail,
} from "./fixtures";

let fixture: BrowserUatFixture;
let manifestPath: string;

const candidateOrigin = "http://127.0.0.1:3000";

async function openCandidatePath(page: Page, path: string) {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");

  const current = new URL(page.url());
  if (current.origin !== candidateOrigin) {
    throw new Error(
      `Source-exact UAT left the candidate runtime; received ${current.origin}.`,
    );
  }

  return response;
}

async function signIn(
  page: Page,
  role: "owner-a" | "manager-a" | "staff-a" | "viewer-a",
) {
  await openCandidatePath(page, "/login");
  await page.getByLabel("Email address", { exact: true }).fill(uatEmail(role, fixture.runId));
  await page.locator('input[name="password"]').fill(process.env.UAT_FIXTURE_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(
    new RegExp(`/businesses/${fixture.businessA}(?:/.*)?$`),
    { timeout: 45_000 },
  );
}

test.describe.serial("WhatsApp V1 authenticated source-exact Staging UAT", () => {
  test.beforeAll(async ({ baseURL }) => {
    const prepared = await prepareBrowserUat(baseURL!);
    fixture = prepared.fixture;
    manifestPath = prepared.manifestPath;
  });

  test.afterAll(async () => {
    if (fixture && manifestPath) await cleanupBrowserUat(fixture.runId, manifestPath);
  });

  test("source-exact runtime reads the seeded Staging fixture @desktop", async ({ page }) => {
    const response = await openCandidatePath(
      page,
      `/card/${encodeURIComponent(fixture.activeCustomer.publicToken)}`,
    );
    expect(response?.status(), "Candidate runtime must read the isolated Staging DB").toBe(200);
    await expect(
      page.getByRole("paragraph").filter({ hasText: "Business A VISITS" }),
    ).toBeVisible();
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
