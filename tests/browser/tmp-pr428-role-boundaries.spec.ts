import { expect, test, type Page } from "@playwright/test";

import {
  cleanupBrowserUat,
  prepareBrowserUat,
  type BrowserUatFixture,
  uatEmail,
} from "./fixtures";

let fixture: BrowserUatFixture;
let manifestPath: string;

function applicationNavigation(page: Page) {
  return page.getByRole("complementary", { name: "Primary navigation", exact: true });
}

async function login(page: Page, role: "manager-a" | "viewer-a") {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(uatEmail(role, fixture.runId));
  await page.getByLabel("Password").fill(process.env.UAT_FIXTURE_PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).press("Enter");
  await expect(page).toHaveURL(new RegExp(`/businesses/${fixture.businessA}$`), {
    timeout: 15_000,
  });
}

test.describe("PR 428 role boundary diagnostic", () => {
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

  test("manager boundary @desktop @manager-boundary", async ({ page }) => {
    await login(page, "manager-a");
    await page.goto(`/businesses/${fixture.businessA}/customers`);
    await expect(page.locator("#app-content").getByRole("heading", { level: 1 })).toHaveCount(1);
    await page.goto(`/businesses/${fixture.businessA}/users`);
    await expect(page).toHaveURL(new RegExp(`/businesses/${fixture.businessA}$`));
    await page.evaluate(
      (url) => window.location.assign(url),
      `/businesses/${fixture.businessB}/customers`,
    );
    await expect(page).toHaveURL(new RegExp(`/businesses/${fixture.businessA}$`));
  });

  test("viewer boundary @desktop @viewer-boundary", async ({ page }) => {
    await login(page, "viewer-a");
    await page.goto(`/businesses/${fixture.businessA}/reports`);
    await expect(page.locator("#app-content").getByRole("heading", { level: 1 })).toHaveCount(1);
    await page.goto(`/businesses/${fixture.businessA}/scan`);
    await expect(page).toHaveURL(new RegExp(`/businesses/${fixture.businessA}$`));
    await expect(applicationNavigation(page).getByRole("link", { name: "Team", exact: true })).toHaveCount(0);
  });
});
