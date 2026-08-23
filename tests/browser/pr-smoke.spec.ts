import { expect, test } from "@playwright/test";

import {
  cleanupBrowserUat,
  prepareBrowserUat,
  type BrowserUatFixture,
  uatEmail,
} from "./fixtures";

let fixture: BrowserUatFixture;
let manifestPath: string;

test.describe.serial("PR browser smoke", () => {
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

  test("owner can sign in, navigate critical surfaces, and log out @desktop @pr-smoke", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email address").fill(uatEmail("owner-a", fixture.runId));
    await page.getByLabel("Password").fill(process.env.UAT_FIXTURE_PASSWORD!);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto(`/businesses/${fixture.businessA}`);
    await expect(page.locator("#app-content").getByRole("heading", { level: 1 })).toHaveCount(1);

    const navigation = page.getByRole("complementary", {
      name: "Primary navigation",
      exact: true,
    });
    await expect(navigation.getByRole("link", { name: "Home", exact: true })).toBeVisible();
    const customersLink = navigation.getByRole("link", {
      name: "Customers",
      exact: true,
    });
    await expect(customersLink).toBeVisible();

    await customersLink.click();
    await expect(page).toHaveURL(new RegExp(`/businesses/${fixture.businessA}/customers$`));
    await expect(page.locator("#app-content").getByRole("heading", { level: 1 })).toHaveCount(1);

    await navigation.getByRole("link", { name: "Home", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/businesses/${fixture.businessA}$`));

    await page.getByRole("button", { name: "Account menu", exact: true }).click();
    await Promise.all([
      page.waitForURL(/\/login$/),
      page.getByRole("button", { name: "Log out", exact: true }).click(),
    ]);
    await expect(page.getByLabel("Email address")).toBeVisible();

    await page.goto(`/businesses/${fixture.businessA}`);
    await expect(page).toHaveURL(/\/login$/);
  });
});
