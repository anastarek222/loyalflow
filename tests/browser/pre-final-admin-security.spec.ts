import { expect, test, type Page } from "@playwright/test";

import {
  cleanupBrowserUat,
  prepareBrowserUat,
  type BrowserUatFixture,
  uatEmail,
} from "./fixtures";

let fixture: BrowserUatFixture;
let manifestPath: string;

async function login(
  page: Page,
  role: "owner-a" | "manager-a" | "staff-a" | "viewer-a" | "superadmin",
) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(uatEmail(role, fixture.runId));
  await page.getByLabel("Password").fill(process.env.UAT_FIXTURE_PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).press("Enter");
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function expectSafePage(page: Page) {
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1))
    .toBe(true);
  await expect(page.locator("#app-content").getByRole("heading", { level: 1 })).toHaveCount(1);
}

test.describe.serial("Pre-final administration and security UAT", () => {
  test.beforeAll(async ({ baseURL }) => {
    const prepared = await prepareBrowserUat(baseURL!);
    fixture = prepared.fixture;
    manifestPath = prepared.manifestPath;
  });

  test.afterAll(async () => {
    if (fixture && manifestPath) await cleanupBrowserUat(fixture.runId, manifestPath);
  });

  test.beforeEach(async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error" && !message.text().includes("favicon.ico")) {
        errors.push(message.text());
      }
    });
    (page as Page & { preFinalErrors?: string[] }).preFinalErrors = errors;
  });

  test.afterEach(async ({ page }) => {
    expect((page as Page & { preFinalErrors?: string[] }).preFinalErrors ?? []).toEqual([]);
  });

  test("owner administration surfaces, customer detail, notifications, and logout-everywhere @desktop", async ({ page }) => {
    test.setTimeout(120_000);
    await login(page, "owner-a");

    await page.goto(`/businesses/${fixture.businessA}/settings`);
    await expect(page.locator('[data-settings-administration="true"]')).toBeVisible();
    await expect(page.getByRole("link", { name: "Business profile", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Operations", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Card details", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Integrations", exact: true })).toBeVisible();
    await expectSafePage(page);

    await page.goto(`/businesses/${fixture.businessA}/program`);
    await expect(page.locator("[data-program-workspace]")).toBeVisible();
    await expect(page.getByRole("link", { name: "Earning rules", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Customer card", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Customer messages", exact: true })).toBeVisible();
    await expectSafePage(page);

    await page.goto(`/businesses/${fixture.businessA}/branches`);
    await expect(page.locator('[data-branches-administration="true"]')).toBeVisible();
    await expect(page.getByText("Branches & assignments", { exact: true })).toBeVisible();
    await expectSafePage(page);

    await page.goto(`/businesses/${fixture.businessA}/users`);
    await expect(page.getByText(uatEmail("manager-a", fixture.runId), { exact: true })).toBeVisible();
    await expect(page.getByText(uatEmail("staff-a", fixture.runId), { exact: true })).toBeVisible();
    await expectSafePage(page);

    await page.goto(`/businesses/${fixture.businessA}/customers/${fixture.activeCustomer.id}`);
    await expect(page.locator("[data-customer-profile-hero]")).toBeVisible();
    await expect(page.locator("[data-experience-customer-detail]")).toBeVisible();
    await expect(page.getByRole("link", { name: /card/i })).toHaveAttribute(
      "href",
      `/card/${fixture.activeCustomer.publicToken}`,
    );
    await expectSafePage(page);

    await page.goto(`/businesses/${fixture.businessA}?notifications=1`);
    const dialog = page.getByRole("dialog", { name: "Important notifications" });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    await page.goto(`/businesses/${fixture.businessA}?notifications=1`);
    await expect(dialog).toBeVisible();
    const markAll = dialog.getByRole("button", { name: "Mark all as read", exact: true });
    if (await markAll.isEnabled()) {
      await markAll.click();
      await expect(dialog.getByRole("button", { name: "All notifications are read", exact: true })).toBeDisabled();
    }

    await page.goto("/account/security");
    await page.once("dialog", (confirmation) => confirmation.accept());
    await Promise.all([
      page.waitForURL(/\/login$/),
      page.getByRole("button", { name: "Log out everywhere", exact: true }).click(),
    ]);
    await page.goto(`/businesses/${fixture.businessA}/settings`);
    await expect(page).toHaveURL(/\/login$/);
  });

  test("super admin custom-card workspace is either configured or explicitly fail-closed @desktop", async ({ page }) => {
    await login(page, "superadmin");
    await page.goto(`/businesses/${fixture.businessA}/program`);
    await expect(page.locator("[data-program-workspace]")).toBeVisible();

    const notConfigured = page.getByText(
      "Vercel Blob is not connected to this environment. Existing artwork remains unchanged and uploads fail closed.",
      { exact: true },
    );

    if (await notConfigured.count()) {
      await expect(notConfigured).toBeVisible();
    } else {
      await expect(page.getByLabel("Front artwork", { exact: true })).toBeVisible();
      await expect(page.getByLabel("Back artwork", { exact: true })).toBeVisible();
      await expect(page.getByRole("button", { name: "Upload new draft version", exact: true })).toBeVisible();
    }
  });

  test("public card keeps the canonical front/back flip surface @mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/card/${fixture.activeCustomer.publicToken}`);
    await expect(page.locator('[data-testid="loyalty-card-flip"]')).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });
});
