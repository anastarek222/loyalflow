import { expect, test, type Page } from "@playwright/test";

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

async function openAccountMenu(
  page: Page,
  language: "EN" | "AR" = "EN",
) {
  const trigger = page.getByRole("button", {
    name: language === "AR" ? "قائمة الحساب" : "Account menu",
    exact: true,
  });

  await expect(async () => {
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true", {
      timeout: 1_000,
    });
  }).toPass({ timeout: 30_000 });
  await expect(
    page.getByLabel(language === "AR" ? "الحساب" : "Account", { exact: true }),
  ).toBeVisible();
}

async function signOut(
  page: Page,
  language: "EN" | "AR" = "EN",
) {
  await openAccountMenu(page, language);
  await Promise.all([
    page.waitForURL(/\/login$/),
    page
      .getByRole("button", {
        name: language === "AR" ? "تسجيل الخروج" : "Log out",
        exact: true,
      })
      .click(),
  ]);
  await expect(page.getByLabel("Email address")).toBeVisible();
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
  test("mobile SaaS drawer keeps Tanee brand parity in both authenticated languages @desktop @pr-smoke", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    const scenarios = [
      {
        email: uatEmail("owner-a", fixture.runId),
        business: fixture.businessA,
        language: "EN",
        dir: "ltr",
        openLabel: "Open full menu",
        closeLabel: "Close navigation",
        drawerLabel: "Navigation menu",
      },
      {
        email: "lf-uat-final-owner-b-" + fixture.runId + "@example.test",
        business: fixture.businessB,
        language: "AR",
        dir: "rtl",
        openLabel: "فتح القائمة",
        closeLabel: "إغلاق القائمة",
        drawerLabel: "قائمة التنقل",
      },
    ] as const;

    for (const scenario of scenarios) {
      await page.goto("/login");
      await page.getByLabel("Email address").fill(scenario.email);
      await page.getByLabel("Password").fill(process.env.UAT_FIXTURE_PASSWORD!);
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await expect(page).toHaveURL(
        new RegExp("/businesses/" + scenario.business + "$"),
        { timeout: 45_000 },
      );

      const localizedShell = page.locator("[data-app-language]");
      await expect(localizedShell).toHaveAttribute("data-app-language", scenario.language);
      await expect(localizedShell).toHaveAttribute("dir", scenario.dir);

      const openNavigation = page
        .getByRole("button", {
          name: scenario.openLabel,
          exact: true,
        })
        .last();
      await expect(openNavigation).toBeVisible();
      await openNavigation.click();

      const drawer = page.getByRole("dialog", {
        name: scenario.drawerLabel,
        exact: true,
      });
      await expect(drawer).toBeVisible();

      const brand = drawer.getByTestId("mobile-saas-brand");
      await expect(brand.locator("[data-inline-tanee-name]")).toBeVisible();
      await expect(
        brand.locator("[data-platform-brand-wordmark-size]"),
      ).toHaveCount(0);

      const brandBox = await brand.boundingBox();
      expect(brandBox).not.toBeNull();
      expect(brandBox!.height).toBeLessThanOrEqual(48);
      expect(brandBox!.width).toBeLessThanOrEqual(160);
      expect(
        await drawer.evaluate((node) => node.scrollWidth <= node.clientWidth),
      ).toBe(true);

      await page
        .getByRole("button", {
          name: scenario.closeLabel,
          exact: true,
        })
        .last()
        .click();
      await expect(drawer).toBeHidden();

      await signOut(page, scenario.language);
    }
  });

  test("marketing header keeps desktop navigation at 1366px in both locales @desktop @pr-smoke", async ({
    page,
    context,
    baseURL,
  }) => {
    await page.setViewportSize({ width: 1366, height: 768 });

    for (const locale of ["en", "ar"] as const) {
      await context.addCookies([
        { name: "loyalflow_locale", value: locale, url: baseURL! },
      ]);

      const response = await page.goto("/faq");
      expect(response?.status()).toBe(200);

      const header = page.getByTestId("marketing-header");
      const desktopNavigation = header.locator(":scope > div > nav");
      const desktopActions = header.locator(":scope > div > div");
      const menuButton = header.locator(
        'button[aria-controls="marketing-mobile-menu"]',
      );

      await expect(desktopNavigation).toBeVisible();
      await expect(desktopNavigation.getByRole("link")).toHaveCount(7);
      await expect(desktopActions).toBeVisible();
      await expect(menuButton).toBeHidden();
      await expect(page.locator("main")).toHaveAttribute(
        "dir",
        locale === "ar" ? "rtl" : "ltr",
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);

      await page.evaluate(() => window.scrollTo(0, 900));
      await expect(header).toHaveAttribute("data-header-visible", "true");
      await expect(header).toBeVisible();
    }
  });

  test("marketing footer keeps usable link targets at 360px and 390px in both locales @desktop @pr-smoke", async ({
    page,
    context,
    baseURL,
  }) => {
    for (const width of [360, 390] as const) {
      await page.setViewportSize({ width, height: 844 });

      for (const locale of ["en", "ar"] as const) {
        await context.addCookies([
          { name: "loyalflow_locale", value: locale, url: baseURL! },
        ]);

        const response = await page.goto("/faq");
        expect(response?.status()).toBe(200);

        const footer = page.getByTestId("marketing-footer");
        await footer.scrollIntoViewIfNeeded();
        await expect(footer).toBeVisible();
        const navigation = footer.getByTestId("marketing-footer-navigation");
        const links = navigation.getByRole("link");
        await expect(links).toHaveCount(12);

        const heights = await links.evaluateAll((nodes) =>
          nodes.map((node) => Math.round(node.getBoundingClientRect().height)),
        );
        expect(Math.min(...heights)).toBeGreaterThanOrEqual(44);
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        ).toBe(true);
        await expect(page.locator("main")).toHaveAttribute(
          "dir",
          locale === "ar" ? "rtl" : "ltr",
        );
      }
    }
  });


});
