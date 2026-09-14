import { expect, test, type Locator, type Page } from "@playwright/test";

import {
  cleanupBrowserUat,
  prepareBrowserUat,
  type BrowserUatFixture,
  uatEmail,
} from "./fixtures";

let fixture: BrowserUatFixture;
let manifestPath: string;

// Webpack compiles each critical route on first use in disposable CI. Keep the
// broader suite bounded while allowing this cold-start smoke file to finish.
test.setTimeout(180_000);

async function signIn(
  page: Page,
  role: "owner-a" | "manager-a" | "viewer-a",
) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(uatEmail(role, fixture.runId));
  await page.getByLabel("Password").fill(process.env.UAT_FIXTURE_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/businesses/${fixture.businessA}$`), {
    timeout: 45_000,
  });
}

async function openAccountMenu(page: Page) {
  const trigger = page.getByRole("button", {
    name: "Account menu",
    exact: true,
  });

  await expect(async () => {
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true", {
      timeout: 1_000,
    });
  }).toPass({ timeout: 30_000 });
  await expect(page.getByLabel("Account", { exact: true })).toBeVisible();
}

async function signOut(page: Page) {
  await openAccountMenu(page);
  await Promise.all([
    page.waitForURL(/\/login$/),
    page.getByRole("button", { name: "Log out", exact: true }).click(),
  ]);
  await expect(page.getByLabel("Email address")).toBeVisible();
}

async function expectSameRow(locator: Locator) {
  const tops = await locator.evaluateAll((nodes) =>
    nodes.map((node) => Math.round(node.getBoundingClientRect().top)),
  );
  expect(tops.length).toBeGreaterThan(1);
  expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(2);
}

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
    await signIn(page, "owner-a");
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

    await signOut(page);

    await page.goto(`/businesses/${fixture.businessA}`);
    await expect(page).toHaveURL(/\/login$/);
  });

  test("account switching refreshes the role-aware shell @desktop @pr-smoke", async ({ page }) => {
    await signIn(page, "manager-a");
    await page.goto(`/businesses/${fixture.businessA}/customers`);
    await expect(page.locator("#app-content").getByRole("heading", { level: 1 })).toHaveCount(1);
    await signOut(page);

    await signIn(page, "viewer-a");
    await page.goto(`/businesses/${fixture.businessA}/reports`);
    await expect(page.locator("#app-content").getByRole("heading", { level: 1 })).toHaveCount(1);
    await page.goto(`/businesses/${fixture.businessA}/scan`);
    await expect(page).toHaveURL(new RegExp(`/businesses/${fixture.businessA}$`));

    const navigation = page.getByRole("complementary", {
      name: "Primary navigation",
      exact: true,
    });
    await expect(
      navigation.getByRole("link", { name: "Team", exact: true }),
    ).toHaveCount(0);
  });

  test("Contact booking stays compact and three-across on a phone viewport @pr-smoke", async ({
    page,
    context,
    baseURL,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    for (const locale of ["en", "ar"] as const) {
      for (const theme of ["light", "dark"] as const) {
        await context.addCookies([
          { name: "loyalflow_locale", value: locale, url: baseURL! },
        ]);
        await page.addInitScript(
          (value) => localStorage.setItem("tanee-marketing-theme", value),
          theme,
        );

        const response = await page.goto("/contact");
        expect(response?.status()).toBe(200);
        await expect(page.locator("main")).toHaveAttribute(
          "dir",
          locale === "ar" ? "rtl" : "ltr",
        );
        await expect(page.locator("html")).toHaveAttribute(
          "data-marketing-theme",
          theme,
        );

        const contactOptions = page.locator("#contact-options > div > a");
        await expect(contactOptions).toHaveCount(3);
        await expectSameRow(contactOptions);

        const firstMethodRow = page.locator(
          "#book-meeting fieldset > div > label:nth-child(-n+3)",
        );
        await expect(firstMethodRow).toHaveCount(3);
        await expectSameRow(firstMethodRow);

        const trigger = page.getByTestId("talk-to-expert-trigger");
        await trigger.click();
        const quickActions = page.locator(
          '[data-testid="talk-to-expert-actions"] > a',
        );
        await expect(quickActions).toHaveCount(3);
        await expectSameRow(quickActions);

        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        ).toBe(true);
      }
    }
  });
});
