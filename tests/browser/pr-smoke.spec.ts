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

async function resetDisposableRateLimit() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return;

  const response = await fetch(new URL("/reset", url), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  expect(response.ok).toBe(true);
}

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

async function expectAuthenticatedCanvasParity(page: Page) {
  const reportCanvas = page.locator('main[data-report-canvas="true"]');
  const appCanvas = page.locator("[data-app-language]").first();
  await expect(reportCanvas).toBeVisible();
  await expect(appCanvas).toBeVisible();

  const [reportBackground, appBackground] = await Promise.all([
    reportCanvas.evaluate((node) => getComputedStyle(node).backgroundColor),
    appCanvas.evaluate((node) => getComputedStyle(node).backgroundColor),
  ]);
  expect(reportBackground).toBe(appBackground);
}

type ShellRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type MarketingShellGeometry = Record<string, ShellRect>;

const MARKETING_SHELL_ROUTES = [
  "/",
  "/features",
  "/how-it-works",
  "/pricing",
  "/about",
  "/faq",
  "/contact",
  "/security",
  "/privacy",
  "/terms",
  "/data-deletion",
  "/get-started",
] as const;

const OPTIONAL_MARKETING_SHELL_ROUTES = ["/demo"] as const;

function roundRectValue(value: number) {
  return Math.round(value * 100) / 100;
}

async function locatorRect(locator: Locator): Promise<ShellRect> {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return {
    x: roundRectValue(box!.x),
    y: roundRectValue(box!.y),
    width: roundRectValue(box!.width),
    height: roundRectValue(box!.height),
  };
}

function relativeRect(rect: ShellRect, origin: ShellRect): ShellRect {
  return {
    x: roundRectValue(rect.x - origin.x),
    y: roundRectValue(rect.y - origin.y),
    width: rect.width,
    height: rect.height,
  };
}

async function captureMarketingShellGeometry(
  page: Page,
): Promise<MarketingShellGeometry> {
  const header = page.getByTestId("marketing-header");
  const footer = page.getByTestId("marketing-footer");
  await expect(header).toBeVisible();
  await expect(footer).toBeAttached();

  const headerRect = await locatorRect(header);
  const footerRect = await locatorRect(footer);
  const geometry: MarketingShellGeometry = {
    "header.root": headerRect,
    "footer.root": {
      x: 0,
      y: 0,
      width: footerRect.width,
      height: footerRect.height,
    },
  };

  const addHeader = async (key: string, locator: Locator) => {
    geometry[key] = await locatorRect(locator);
  };
  const addFooter = async (key: string, locator: Locator) => {
    geometry[key] = relativeRect(await locatorRect(locator), footerRect);
  };

  const headerShell = header.locator('[data-marketing-header-shell="true"]');
  const headerBrand = header.locator('[data-marketing-header-brand="true"]');
  const headerNav = header.locator('[data-marketing-header-nav="true"]');
  const headerActions = header.locator('[data-marketing-header-actions="true"]');
  const activeWordmarkTheme =
    (await page.locator("html").getAttribute("data-marketing-theme")) === "dark"
      ? "dark"
      : "light";
  const wordmarkSelector =
    `[data-platform-brand-wordmark-theme="${activeWordmarkTheme}"]`;

  await addHeader("header.shell", headerShell);
  await addHeader("header.brand", headerBrand);
  await addHeader(
    "header.wordmark",
    headerBrand.locator(wordmarkSelector),
  );
  await addHeader("header.nav", headerNav);
  await addHeader("header.actions", headerActions);
  await addHeader(
    "header.theme",
    header.locator('[data-marketing-header-theme-slot="true"]'),
  );
  await addHeader(
    "header.language",
    header.locator('[data-marketing-header-language-slot="true"]'),
  );
  await addHeader(
    "header.signin",
    header.locator('[data-marketing-header-signin-slot="true"]'),
  );
  await addHeader(
    "header.cta",
    header.locator('[data-marketing-header-cta-slot="true"]'),
  );

  const headerNavLinks = headerNav.getByRole("link");
  await expect(headerNavLinks).toHaveCount(7);
  for (let index = 0; index < 7; index += 1) {
    await addHeader(`header.nav.${index}`, headerNavLinks.nth(index));
  }

  const footerShell = footer.locator('[data-marketing-footer-shell="true"]');
  const footerBrand = footer.locator('[data-marketing-footer-brand="true"]');
  const footerNav = footer.locator('[data-marketing-footer-navigation="true"]');
  const footerBottom = footer.locator('[data-marketing-footer-bottom="true"]');

  await addFooter("footer.shell", footerShell);
  await addFooter("footer.brand", footerBrand);
  await addFooter(
    "footer.wordmark",
    footerBrand.locator(wordmarkSelector),
  );
  await addFooter("footer.nav", footerNav);
  await addFooter("footer.bottom", footerBottom);
  await addFooter(
    "footer.actions",
    footer.locator('[data-marketing-footer-actions="true"]'),
  );
  await addFooter(
    "footer.theme",
    footer.locator('[data-marketing-footer-theme-slot="true"]'),
  );
  await addFooter(
    "footer.language",
    footer.locator('[data-marketing-footer-language-slot="true"]'),
  );
  await addFooter(
    "footer.access",
    footer.locator('[data-marketing-footer-access-slot="true"]'),
  );

  const footerColumns = footerNav.locator(":scope > div");
  await expect(footerColumns).toHaveCount(4);
  for (let index = 0; index < 4; index += 1) {
    await addFooter(`footer.nav.${index}`, footerColumns.nth(index));
  }

  return geometry;
}

function expectMarketingShellGeometryMatch(
  actual: MarketingShellGeometry,
  expected: MarketingShellGeometry,
  context: string,
) {
  expect(Object.keys(actual).sort()).toEqual(Object.keys(expected).sort());
  for (const key of Object.keys(expected)) {
    for (const field of ["x", "y", "width", "height"] as const) {
      const delta = Math.abs(actual[key][field] - expected[key][field]);
      expect(
        delta,
        `${context}: ${key}.${field} drifted by ${delta}px (expected ${expected[key][field]}, received ${actual[key][field]})`,
      ).toBeLessThanOrEqual(1);
    }
  }
}

async function setMarketingVariant(
  page: Page,
  context: import("@playwright/test").BrowserContext,
  baseURL: string,
  route: string,
  locale: "en" | "ar",
  theme: "light" | "dark",
) {
  await context.addCookies([
    { name: "loyalflow_locale", value: locale, url: baseURL },
  ]);

  const response = await page.goto(route);
  expect(response?.status()).toBe(200);
  await page.evaluate(
    (value) => localStorage.setItem("tanee-marketing-theme", value),
    theme,
  );
  await page.reload();

  await expect(page.locator("html")).toHaveAttribute(
    "data-marketing-theme",
    theme,
  );
  await expect(page.locator("main")).toHaveAttribute(
    "dir",
    locale === "ar" ? "rtl" : "ltr",
  );
}

async function setAuthenticatedLanguage(
  page: Page,
  target: "en" | "ar",
) {
  const shell = page.locator("[data-app-language]").first();
  const targetLanguage = target === "ar" ? "AR" : "EN";

  if ((await shell.getAttribute("data-app-language")) === targetLanguage) {
    return;
  }

  const topbar = page.locator('[data-shell-topbar="true"]');
  const targetInput = topbar.locator(
    `input[name="language"][value="${targetLanguage}"]`,
  );
  await expect(targetInput).toHaveCount(1);

  const switchForm = targetInput.locator("xpath=..");
  const switchButton = switchForm.getByRole("button");
  await expect(switchButton).toBeVisible();

  const currentUrl = new URL(page.url());
  const actionResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname === currentUrl.pathname,
  );
  await switchButton.click();
  await actionResponse;
  await page.reload();
  await expect(shell).toHaveAttribute("data-app-language", targetLanguage, {
    timeout: 10_000,
  });
}

async function setAuthenticatedExperienceMode(
  page: Page,
  target: "SIMPLE" | "ADVANCED",
) {
  await openAccountMenu(page);
  const account = page.getByLabel("Account", { exact: true });
  const button = account.getByRole("button", {
    name: target === "SIMPLE" ? "Simple" : "Advanced",
    exact: true,
  });
  await expect(button).toBeVisible();

  if ((await button.getAttribute("aria-pressed")) !== "true") {
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true", {
      timeout: 10_000,
    });
  }
}

test.describe.serial("PR browser smoke", () => {
  test.beforeEach(async () => {
    await resetDisposableRateLimit();
  });

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

  test("mobile SaaS drawer keeps Tanee brand parity in both locales @desktop @pr-smoke", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page, "owner-a");
    await page.goto(`/businesses/${fixture.businessA}`);

    async function assertDrawer(
      locale: "en" | "ar",
    ) {
      const localeShell = page.locator("[data-app-language]").first();
      await expect(localeShell).toHaveAttribute(
        "data-app-language",
        locale === "ar" ? "AR" : "EN",
      );
      await expect(localeShell).toHaveAttribute(
        "dir",
        locale === "ar" ? "rtl" : "ltr",
      );

      const openNavigation = page.getByRole("banner").getByRole("button", {
        name: locale === "ar" ? "فتح القائمة" : "Open navigation",
        exact: true,
      });
      await expect(openNavigation).toBeVisible();
      await expect(
        page.getByRole("navigation", {
          name: locale === "ar" ? "التنقل السريع" : "Quick navigation",
          exact: true,
        }).getByRole("button", {
          name: locale === "ar" ? "فتح القائمة الكاملة" : "Open full menu",
          exact: true,
        }),
      ).toBeVisible();
      await openNavigation.click();

      const drawer = page.getByRole("dialog", {
        name: locale === "ar" ? "قائمة التنقل" : "Navigation menu",
        exact: true,
      });
      await expect(drawer).toBeVisible();

      const brand = drawer.getByTestId("mobile-saas-brand");
      const inlineBrand = brand.locator("[data-inline-tanee-name]");
      await expect(inlineBrand).toBeVisible();
      await expect(
        brand.locator("[data-platform-brand-wordmark-size]"),
      ).toHaveCount(0);

      const brandBox = await inlineBrand.boundingBox();
      expect(brandBox).not.toBeNull();
      expect(brandBox!.height).toBeLessThanOrEqual(48);
      expect(brandBox!.width).toBeLessThanOrEqual(160);
      expect(
        await drawer.evaluate((node) => node.scrollWidth <= node.clientWidth),
      ).toBe(true);

      await page
        .getByRole("button", {
          name: locale === "ar" ? "إغلاق القائمة" : "Close navigation",
          exact: true,
        })
        .last()
        .click();
      await expect(drawer).toBeHidden();
    }

    await assertDrawer("en");

    await setAuthenticatedLanguage(page, "ar");
    await assertDrawer("ar");
    await setAuthenticatedLanguage(page, "en");
  });

  test("SaaS shell preserves Tanee brand, theme, and locale parity @desktop @pr-smoke", async ({
    page,
  }) => {
    await signIn(page, "owner-a");
    const route = `/businesses/${fixture.businessA}`;

    for (const viewport of [
      { width: 390, height: 844, name: "390" },
      { width: 1366, height: 768, name: "1366" },
    ] as const) {
      await page.setViewportSize(viewport);

      for (const locale of ["en", "ar"] as const) {
        await setAuthenticatedLanguage(page, locale);

        for (const theme of ["light", "dark"] as const) {
          await page.evaluate(
            (value) => localStorage.setItem("tanee-theme", value),
            theme,
          );
          await page.goto(route);

          const dashboard = page.locator(
            '[data-experience-dashboard="simple"]',
          );
          await expect(dashboard).toBeVisible();
          await expect(dashboard).toHaveAttribute(
            "data-experience-mode",
            "SIMPLE",
          );
          await expect(
            dashboard.getByLabel(
              locale === "ar"
                ? "جاهز للعميل التالي؟"
                : "Ready for the next customer?",
              { exact: true },
            ),
          ).toBeVisible();
          await expect(
            dashboard.getByLabel(locale === "ar" ? "اليوم" : "Today", {
              exact: true,
            }),
          ).toBeVisible();

          const html = page.locator("html");
          const localeShell = page.locator("[data-app-language]").first();
          const themeSwitcher = page
            .getByTestId("saas-theme-switcher")
            .getByRole("button");

          await expect(html).toHaveAttribute("data-theme", theme);
          if (theme === "dark") {
            await expect(html).toHaveClass(/\bdark\b/);
          } else {
            await expect(html).not.toHaveClass(/\bdark\b/);
          }

          await expect(localeShell).toHaveAttribute(
            "data-app-language",
            locale === "ar" ? "AR" : "EN",
          );
          await expect(localeShell).toHaveAttribute(
            "dir",
            locale === "ar" ? "rtl" : "ltr",
          );
          await expect(themeSwitcher).toBeVisible();

          const desktopNavigation = page.getByRole("complementary", {
            name: locale === "ar" ? "التنقل الرئيسي" : "Primary navigation",
            exact: true,
          });
          const mobileNavigation = page.getByRole("navigation", {
            name: locale === "ar" ? "التنقل السريع" : "Quick navigation",
            exact: true,
          });

          if (viewport.width < 1024) {
            await expect(desktopNavigation).toBeHidden();
            await expect(mobileNavigation).toBeVisible();

            const openNavigation = page
              .getByRole("banner")
              .getByRole("button", {
                name: locale === "ar" ? "فتح القائمة" : "Open navigation",
                exact: true,
              });
            await openNavigation.click();

            const drawer = page.getByRole("dialog", {
              name: locale === "ar" ? "قائمة التنقل" : "Navigation menu",
              exact: true,
            });
            await expect(drawer).toBeVisible();
            await expect(
              drawer
                .getByTestId("mobile-saas-brand")
                .locator("[data-inline-tanee-name]"),
            ).toBeVisible();

            await page
              .getByRole("button", {
                name: locale === "ar" ? "إغلاق القائمة" : "Close navigation",
                exact: true,
              })
              .last()
              .click();
            await expect(drawer).toBeHidden();
          } else {
            await expect(desktopNavigation).toBeVisible();
            await expect(mobileNavigation).toBeHidden();
            await expect(
              page
                .getByTestId("desktop-saas-brand")
                .locator("[data-inline-tanee-name]"),
            ).toBeVisible();
          }

          const overflowState = await page.evaluate(() => {
            const describe = (node: HTMLElement) => {
              const rect = node.getBoundingClientRect();
              return {
                tag: node.tagName.toLowerCase(),
                testId: node.dataset.testid ?? "",
                className: typeof node.className === "string" ? node.className : "",
                text: (node.textContent ?? "").trim().replace(/\\s+/g, " ").slice(0, 120),
                left: Number(rect.left.toFixed(2)),
                right: Number(rect.right.toFixed(2)),
                width: Number(rect.width.toFixed(2)),
                clientWidth: node.clientWidth,
                scrollWidth: node.scrollWidth,
              };
            };

            const overflowing = Array.from(
              document.querySelectorAll<HTMLElement>("body *"),
            )
              .map(describe)
              .filter(
                (item) =>
                  item.width > 0 &&
                  (item.left < -0.25 || item.right > window.innerWidth + 0.25),
              )
              .slice(0, 16);

            return {
              viewportWidth: window.innerWidth,
              root: describe(document.documentElement),
              body: describe(document.body),
              overflowing,
            };
          });

          await page.screenshot({
            path: test.info().outputPath(
              `saas-shell-${viewport.name}-${locale}-${theme}.png`,
            ),
            fullPage: true,
          });

          expect(
            overflowState.root.scrollWidth <= overflowState.viewportWidth,
            JSON.stringify(overflowState, null, 2),
          ).toBe(true);
        }
      }
    }

    await setAuthenticatedLanguage(page, "en");
  });

  test("advanced Dashboard preserves manager content across locale theme and viewport @desktop @pr-smoke", async ({
    page,
  }) => {
    await signIn(page, "manager-a");
    const route = `/businesses/${fixture.businessA}`;

    for (const viewport of [
      { width: 390, height: 844, name: "390" },
      { width: 1366, height: 768, name: "1366" },
    ] as const) {
      await page.setViewportSize(viewport);

      for (const locale of ["en", "ar"] as const) {
        await setAuthenticatedLanguage(page, locale);

        for (const theme of ["light", "dark"] as const) {
          await page.evaluate(
            (value) => localStorage.setItem("tanee-theme", value),
            theme,
          );
          await page.goto(route);

          const dashboard = page.locator('[data-experience-mode="ADVANCED"]');
          await expect(dashboard).toBeVisible();
          await expect(
            dashboard.getByLabel(
              locale === "ar"
                ? "مؤشرات الأداء الرئيسية اليومية"
                : "Daily key performance indicators",
              { exact: true },
            ),
          ).toBeVisible();
          await expect(
            dashboard.getByLabel(
              locale === "ar" ? "إجراءات سريعة" : "Quick actions",
              { exact: true },
            ),
          ).toBeVisible();

          await expect(
            dashboard.getByText(
              locale === "ar"
                ? "نمو العملاء خلال 30 يومًا"
                : "Customer growth over 30 days",
              { exact: true },
            ),
          ).toBeVisible();
          await expect(
            dashboard.getByText(
              locale === "ar"
                ? "اختصارات شرائح العملاء"
                : "Customer segment shortcuts",
              { exact: true },
            ),
          ).toBeVisible();

          const localeShell = page.locator("[data-app-language]").first();
          await expect(localeShell).toHaveAttribute(
            "dir",
            locale === "ar" ? "rtl" : "ltr",
          );
          await expect(page.locator("html")).toHaveAttribute(
            "data-theme",
            theme,
          );
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
          ).toBe(true);

          await page.screenshot({
            path: test.info().outputPath(
              `saas-shell-dashboard-advanced-${viewport.name}-${locale}-${theme}.png`,
            ),
            fullPage: true,
          });
        }
      }
    }

    await setAuthenticatedLanguage(page, "en");
    await signOut(page);
  });

  test("Customers SIMPLE preserves search, cards, locale and theme across viewports @desktop @pr-smoke", async ({
    page,
  }) => {
    await signIn(page, "owner-a");
    const route = `/businesses/${fixture.businessA}/customers`;

    for (const viewport of [
      { width: 390, height: 844, name: "390" },
      { width: 1366, height: 768, name: "1366" },
    ] as const) {
      await page.setViewportSize(viewport);

      for (const locale of ["en", "ar"] as const) {
        await setAuthenticatedLanguage(page, locale);

        for (const theme of ["light", "dark"] as const) {
          await page.evaluate(
            (value) => localStorage.setItem("tanee-theme", value),
            theme,
          );
          await page.goto(route);

          const main = page.locator('main[data-experience-customers="simple"]');
          await expect(main).toBeVisible();
          await expect(main).toHaveAttribute("data-experience-mode", "SIMPLE");
          await expect(
            page.locator("#app-content").getByRole("heading", {
              level: 1,
              name: locale === "ar" ? "العملاء" : "Customers",
              exact: true,
            }),
          ).toBeVisible();

          const search = main.getByLabel(locale === "ar" ? "البحث" : "Search", {
            exact: true,
          });
          await expect(search).toBeVisible();
          await expect(search).toHaveAttribute(
            "placeholder",
            locale === "ar"
              ? "الاسم أو الهاتف أو كود العميل"
              : "Name, phone, or customer code",
          );

          const mobileList = main.getByLabel(
            locale === "ar" ? "قائمة العملاء على الجوال" : "Mobile customer list",
            { exact: true },
          );
          await expect(mobileList).toBeVisible();
          expect(await mobileList.getByRole("link").count()).toBeGreaterThan(0);
          await expect(main.locator("table")).toHaveCount(0);

          const advancedOptions = main
            .getByText(locale === "ar" ? "خيارات متقدمة" : "Advanced options", {
              exact: true,
            })
            .last();
          await expect(advancedOptions).toBeVisible();

          await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
          await expect(page.locator("[data-app-language]").first()).toHaveAttribute(
            "dir",
            locale === "ar" ? "rtl" : "ltr",
          );
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
          ).toBe(true);

          await page.screenshot({
            path: test.info().outputPath(
              `saas-shell-customers-simple-${viewport.name}-${locale}-${theme}.png`,
            ),
            fullPage: true,
          });
        }
      }
    }

    await setAuthenticatedLanguage(page, "en");
    await signOut(page);
  });

  test("Customers ADVANCED preserves filters and table-to-card responsiveness @desktop @pr-smoke", async ({
    page,
  }) => {
    await signIn(page, "manager-a");
    const route = `/businesses/${fixture.businessA}/customers`;

    for (const viewport of [
      { width: 390, height: 844, name: "390" },
      { width: 1366, height: 768, name: "1366" },
    ] as const) {
      await page.setViewportSize(viewport);

      for (const locale of ["en", "ar"] as const) {
        await setAuthenticatedLanguage(page, locale);

        for (const theme of ["light", "dark"] as const) {
          await page.evaluate(
            (value) => localStorage.setItem("tanee-theme", value),
            theme,
          );
          await page.goto(route);

          const main = page.locator('main[data-experience-customers="advanced"]');
          await expect(main).toBeVisible();
          await expect(main).toHaveAttribute("data-experience-mode", "ADVANCED");
          await expect(
            page.locator("#app-content").getByRole("heading", {
              level: 1,
              name: locale === "ar" ? "العملاء" : "Customers",
              exact: true,
            }),
          ).toBeVisible();

          await expect(
            main.getByLabel(locale === "ar" ? "البحث" : "Search", {
              exact: true,
            }),
          ).toBeVisible();

          const advancedOptions = main
            .getByText(locale === "ar" ? "خيارات متقدمة" : "Advanced options", {
              exact: true,
            })
            .first();
          await advancedOptions.click();

          await expect(
            main.getByLabel(locale === "ar" ? "الحالة" : "Status", {
              exact: true,
            }),
          ).toBeVisible();
          await expect(
            main.getByLabel(
              locale === "ar" ? "شريحة العميل" : "Customer segment",
              { exact: true },
            ),
          ).toBeVisible();
          await expect(
            main.getByLabel(locale === "ar" ? "الترتيب" : "Sort", {
              exact: true,
            }),
          ).toBeVisible();

          const table = main.locator("table");
          const mobileList = main.getByLabel(
            locale === "ar" ? "قائمة العملاء على الجوال" : "Mobile customer list",
            { exact: true },
          );
          if (viewport.width >= 1024) {
            await expect(table).toBeVisible();
            await expect(mobileList).toBeHidden();
            expect(await table.locator("tbody tr").count()).toBeGreaterThan(0);
          } else {
            await expect(table).toBeHidden();
            await expect(mobileList).toBeVisible();
            expect(await mobileList.getByRole("link").count()).toBeGreaterThan(0);
          }

          await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
          await expect(page.locator("[data-app-language]").first()).toHaveAttribute(
            "dir",
            locale === "ar" ? "rtl" : "ltr",
          );
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
          ).toBe(true);

          await page.screenshot({
            path: test.info().outputPath(
              `saas-shell-customers-advanced-${viewport.name}-${locale}-${theme}.png`,
            ),
            fullPage: true,
          });
        }
      }
    }

    await setAuthenticatedLanguage(page, "en");
    await signOut(page);
  });

  test("Customer detail SIMPLE preserves focused loyalty profile across locale theme and viewport @desktop @pr-smoke", async ({
    page,
  }) => {
    await signIn(page, "owner-a");
    const route = `/businesses/${fixture.businessA}/customers/${fixture.activeCustomer.id}`;

    for (const viewport of [
      { width: 390, height: 844, name: "390" },
      { width: 1366, height: 768, name: "1366" },
    ] as const) {
      await page.setViewportSize(viewport);

      for (const locale of ["en", "ar"] as const) {
        await setAuthenticatedLanguage(page, locale);

        for (const theme of ["light", "dark"] as const) {
          await page.evaluate(
            (value) => localStorage.setItem("tanee-theme", value),
            theme,
          );
          await page.goto(route);

          const main = page.locator(
            'main[data-experience-customer-detail="simple"]',
          );
          await expect(main).toBeVisible();
          await expect(main).toHaveAttribute("data-experience-mode", "SIMPLE");

          const hero = main.locator("[data-customer-profile-hero]");
          await expect(hero).toBeVisible();
          await expect(
            hero.getByText(
              locale === "ar" ? "ملف العميل" : "Customer profile",
              { exact: true },
            ),
          ).toBeVisible();
          await expect(hero.getByRole("heading", { level: 1 })).toBeVisible();

          await expect(
            main.getByText(
              locale === "ar" ? "الولاء اليوم" : "Loyalty today",
              { exact: true },
            ),
          ).toBeVisible();
          await expect(main.locator("#daily-loyalty")).toBeVisible();

          const timeline = main.locator("[data-customer-activity-timeline]");
          const timelineDisclosure = timeline.locator(
            "xpath=ancestor::details[@data-operational-disclosure][1]",
          );
          await expect(timelineDisclosure).toBeVisible();
          await expect(timeline).toBeHidden();
          await timelineDisclosure.locator("summary").click();
          await expect(timeline).toBeVisible();

          const cardDisclosure = main.locator(
            '#customer-card[data-operational-disclosure]',
          );
          await expect(cardDisclosure).toBeVisible();
          await expect(cardDisclosure.locator("summary")).toContainText(
            locale === "ar" ? "الكارت والمشاركة" : "Card & sharing",
          );
          await cardDisclosure.locator("summary").click();
          await expect(
            cardDisclosure.locator(
              `a[href="/card/${fixture.activeCustomer.publicToken}"]`,
            ),
          ).toBeVisible();

          const hiddenAdvancedTitles = [
            locale === "ar" ? "وسوم العميل" : "Customer tags",
            locale === "ar" ? "ملاحظات داخلية" : "Internal notes",
            locale === "ar" ? "بيانات العميل" : "Customer details",
            locale === "ar" ? "تعديل رصيد الولاء" : "Adjust loyalty balance",
            locale === "ar" ? "منطقة الخطر" : "Danger zone",
          ];
          for (const title of hiddenAdvancedTitles) {
            const disclosure = main
              .locator("details[data-operational-disclosure]")
              .filter({ hasText: title })
              .first();
            await expect(disclosure).toBeHidden();
          }

          const quickActions = main.locator("[data-customer-quick-actions]");
          if (viewport.width < 640) {
            await expect(quickActions).toBeVisible();
          } else {
            await expect(quickActions).toBeHidden();
          }

          await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
          await expect(page.locator("[data-app-language]").first()).toHaveAttribute(
            "dir",
            locale === "ar" ? "rtl" : "ltr",
          );
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
          ).toBe(true);

          await page.screenshot({
            path: test.info().outputPath(
              `saas-shell-customer-detail-simple-${viewport.name}-${locale}-${theme}.png`,
            ),
            fullPage: true,
          });
        }
      }
    }

    await setAuthenticatedLanguage(page, "en");
    await signOut(page);
  });

  test("Customer detail ADVANCED preserves operational disclosures across locale theme and viewport @desktop @pr-smoke", async ({
    page,
  }) => {
    await signIn(page, "manager-a");
    const route = `/businesses/${fixture.businessA}/customers/${fixture.activeCustomer.id}`;

    for (const viewport of [
      { width: 390, height: 844, name: "390" },
      { width: 1366, height: 768, name: "1366" },
    ] as const) {
      await page.setViewportSize(viewport);

      for (const locale of ["en", "ar"] as const) {
        await setAuthenticatedLanguage(page, locale);

        for (const theme of ["light", "dark"] as const) {
          await page.evaluate(
            (value) => localStorage.setItem("tanee-theme", value),
            theme,
          );
          await page.goto(route);

          const main = page.locator(
            'main[data-experience-customer-detail="advanced"]',
          );
          await expect(main).toBeVisible();
          await expect(main).toHaveAttribute("data-experience-mode", "ADVANCED");

          const hero = main.locator("[data-customer-profile-hero]");
          await expect(hero).toBeVisible();
          await expect(
            hero.getByText(
              locale === "ar" ? "ملف العميل" : "Customer profile",
              { exact: true },
            ),
          ).toBeVisible();
          await expect(main.locator("#daily-loyalty")).toBeVisible();
          await expect(
            main.getByText(
              locale === "ar" ? "الولاء اليوم" : "Loyalty today",
              { exact: true },
            ),
          ).toHaveCount(0);

          const advancedTitles = [
            locale === "ar" ? "وسوم العميل" : "Customer tags",
            locale === "ar" ? "ملاحظات داخلية" : "Internal notes",
            locale === "ar" ? "بيانات العميل" : "Customer details",
            locale === "ar" ? "تعديل رصيد الولاء" : "Adjust loyalty balance",
            locale === "ar" ? "منطقة الخطر" : "Danger zone",
          ];
          for (const title of advancedTitles) {
            const disclosure = main
              .locator("details[data-operational-disclosure]")
              .filter({ hasText: title })
              .first();
            await expect(disclosure).toBeVisible();
          }

          const timeline = main.locator(
            "[data-customer-activity-timeline]",
          );
          const timelineDisclosure = timeline.locator(
            "xpath=ancestor::details[@data-operational-disclosure][1]",
          );
          await expect(timelineDisclosure).toBeVisible();
          await expect(timeline).toBeHidden();
          await timelineDisclosure.locator("summary").click();
          await expect(timeline).toBeVisible();

          const cardDisclosure = main.locator(
            '#customer-card[data-operational-disclosure]',
          );
          await expect(cardDisclosure).toBeVisible();
          await expect(cardDisclosure.locator("summary")).toContainText(
            locale === "ar" ? "الكارت والمشاركة" : "Card & sharing",
          );

          const quickActions = main.locator("[data-customer-quick-actions]");
          if (viewport.width < 640) {
            await expect(quickActions).toBeVisible();
          } else {
            await expect(quickActions).toBeHidden();
          }

          await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
          await expect(page.locator("[data-app-language]").first()).toHaveAttribute(
            "dir",
            locale === "ar" ? "rtl" : "ltr",
          );
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
          ).toBe(true);

          await page.screenshot({
            path: test.info().outputPath(
              `saas-shell-customer-detail-advanced-${viewport.name}-${locale}-${theme}.png`,
            ),
            fullPage: true,
          });
        }
      }
    }

    await setAuthenticatedLanguage(page, "en");
    await signOut(page);
  });

  test("Reports SIMPLE preserves summary scope and hides advanced analytics across locale theme and viewport @desktop @pr-smoke", async ({
    page,
  }) => {
    await signIn(page, "owner-a");
    const route = `/businesses/${fixture.businessA}/reports`;

    for (const viewport of [
      { width: 390, height: 844, name: "390" },
      { width: 1366, height: 768, name: "1366" },
    ] as const) {
      await page.setViewportSize(viewport);

      for (const locale of ["en", "ar"] as const) {
        await setAuthenticatedLanguage(page, locale);

        for (const theme of ["light", "dark"] as const) {
          await page.evaluate(
            (value) => localStorage.setItem("tanee-theme", value),
            theme,
          );
          await page.goto(route);

          const workspace = page.locator('[data-reports-workspace="true"]');
          await expect(workspace).toBeVisible();
          await expect(workspace).toHaveAttribute("data-experience-mode", "SIMPLE");
          await expect(
            workspace.getByRole("heading", {
              level: 1,
              name: locale === "ar" ? "التقارير والتحليلات" : "Reports & analytics",
              exact: true,
            }),
          ).toBeVisible();

          const filters = workspace.locator('details[data-report-filters="true"]');
          await expect(filters).toBeVisible();
          await expect(filters).not.toHaveAttribute("open", "");
          await filters.locator("summary").click();
          await expect(
            filters.getByLabel(locale === "ar" ? "شريحة العملاء" : "Customer segment", {
              exact: true,
            }),
          ).toBeVisible();
          await expect(
            filters.getByLabel(locale === "ar" ? "الفرع" : "Branch", {
              exact: true,
            }),
          ).toBeVisible();

          const summary = workspace.locator('[data-report-summary="true"]');
          await expect(summary).toBeVisible();
          await expect(summary.locator(":scope > article, :scope > a")).toHaveCount(4);

          const ledger = workspace.locator(
            'details[data-ledger-summary="gross-reversal-net"]',
          );
          await expect(ledger).toBeVisible();

          await expect(
            workspace.locator('[data-report-advanced-metrics="true"]'),
          ).toBeHidden();
          await expect(
            workspace.locator('details[data-report-impact="true"]'),
          ).toBeHidden();
          await expect(
            workspace.locator('[data-report-activity-mobile="cards"]'),
          ).toBeHidden();
          await expect(
            workspace.locator('[data-report-activity-desktop="table"]'),
          ).toBeHidden();

          await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
          await expectAuthenticatedCanvasParity(page);
          await expect(page.locator("[data-app-language]").first()).toHaveAttribute(
            "dir",
            locale === "ar" ? "rtl" : "ltr",
          );
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
          ).toBe(true);

          await page.screenshot({
            path: test.info().outputPath(
              `saas-shell-reports-simple-${viewport.name}-${locale}-${theme}.png`,
            ),
            fullPage: true,
          });
        }
      }
    }

    await setAuthenticatedLanguage(page, "en");
    await signOut(page);
  });

  test("Reports ADVANCED preserves filters, analytics disclosures and responsive activity @desktop @pr-smoke", async ({
    page,
  }) => {
    await signIn(page, "manager-a");
    const route = `/businesses/${fixture.businessA}/reports`;

    for (const viewport of [
      { width: 390, height: 844, name: "390" },
      { width: 1366, height: 768, name: "1366" },
    ] as const) {
      await page.setViewportSize(viewport);

      for (const locale of ["en", "ar"] as const) {
        await setAuthenticatedLanguage(page, locale);

        for (const theme of ["light", "dark"] as const) {
          await page.evaluate(
            (value) => localStorage.setItem("tanee-theme", value),
            theme,
          );
          await page.goto(route);

          const workspace = page.locator('[data-reports-workspace="true"]');
          await expect(workspace).toBeVisible();
          await expect(workspace).toHaveAttribute("data-experience-mode", "ADVANCED");
          await expect(
            workspace.getByRole("heading", {
              level: 1,
              name: locale === "ar" ? "التقارير والتحليلات" : "Reports & analytics",
              exact: true,
            }),
          ).toBeVisible();

          const filters = workspace.locator('details[data-report-filters="true"]');
          await expect(filters).toBeVisible();
          await filters.locator("summary").click();
          await expect(
            filters.getByLabel(locale === "ar" ? "الموظف المنسوب إليه" : "Attributed staff", {
              exact: true,
            }),
          ).toBeVisible();

          const advancedMetrics = workspace.locator(
            '[data-report-advanced-metrics="true"]',
          );
          const advancedDisclosure = advancedMetrics.locator(
            "xpath=ancestor::details[1]",
          );
          await expect(advancedDisclosure).toBeVisible();
          await expect(advancedMetrics).toBeHidden();
          await advancedDisclosure.locator("summary").click();
          await expect(advancedMetrics).toBeVisible();

          const impact = workspace.locator('details[data-report-impact="true"]');
          await expect(impact).toBeVisible();
          await impact.locator("summary").click();
          await expect(
            impact.getByRole("heading", {
              level: 2,
              name:
                locale === "ar"
                  ? "مؤشرات تشغيلية موثقة"
                  : "Documented operational signals",
              exact: true,
            }),
          ).toBeVisible();

          const mobileActivity = workspace.locator(
            '[data-report-activity-mobile="cards"]',
          );
          const desktopActivity = workspace.locator(
            '[data-report-activity-desktop="table"]',
          );
          const activityDisclosure = mobileActivity.locator(
            "xpath=ancestor::details[1]",
          );
          await expect(activityDisclosure).toBeVisible();
          await activityDisclosure.locator("summary").click();

          if (viewport.width < 768) {
            await expect(mobileActivity).toBeVisible();
            await expect(desktopActivity).toBeHidden();
          } else {
            await expect(mobileActivity).toBeHidden();
            await expect(desktopActivity).toBeVisible();
            expect(await desktopActivity.locator("tbody tr").count()).toBeGreaterThan(0);
          }

          const summary = workspace.locator('[data-report-summary="true"]');
          await expect(summary).toBeVisible();
          await expect(summary.locator(":scope > article, :scope > a")).toHaveCount(4);

          await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
          await expectAuthenticatedCanvasParity(page);
          await expect(page.locator("[data-app-language]").first()).toHaveAttribute(
            "dir",
            locale === "ar" ? "rtl" : "ltr",
          );
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
          ).toBe(true);

          await page.screenshot({
            path: test.info().outputPath(
              `saas-shell-reports-advanced-${viewport.name}-${locale}-${theme}.png`,
            ),
            fullPage: true,
          });
        }
      }
    }

    await setAuthenticatedLanguage(page, "en");
    await signOut(page);
  });

  test("Staff reports SIMPLE preserves summary and filters while hiding advanced staff detail across locale theme and viewport @desktop @pr-smoke", async ({
    page,
  }) => {
    await signIn(page, "owner-a");
    const route = `/businesses/${fixture.businessA}/reports/staff`;

    for (const viewport of [
      { width: 390, height: 844, name: "390" },
      { width: 1366, height: 768, name: "1366" },
    ] as const) {
      await page.setViewportSize(viewport);

      for (const locale of ["en", "ar"] as const) {
        await setAuthenticatedLanguage(page, locale);

        for (const theme of ["light", "dark"] as const) {
          await page.evaluate(
            (value) => localStorage.setItem("tanee-theme", value),
            theme,
          );
          const response = await page.goto(route);
          expect(response?.status()).toBe(200);

          const workspace = page.locator(
            '[data-staff-reports-workspace="true"]',
          );
          await expect(workspace).toBeVisible();
          await expect(workspace).toHaveAttribute(
            "data-experience-mode",
            "SIMPLE",
          );
          await expect(
            workspace.getByRole("heading", {
              level: 1,
              name: locale === "ar" ? "أداء الفريق" : "Staff performance",
              exact: true,
            }),
          ).toBeVisible();

          const filters = workspace.locator(
            '[data-staff-report-filters="true"]',
          );
          await expect(filters).toBeVisible();
          await expect(
            filters.getByLabel(locale === "ar" ? "الفرع" : "Branch", {
              exact: true,
            }),
          ).toBeVisible();
          await expect(
            filters.getByLabel(
              locale === "ar" ? "الموظف المنسوب إليه" : "Attributed staff",
              { exact: true },
            ),
          ).toBeVisible();

          const summary = workspace.locator(
            '[data-staff-report-summary="true"]',
          );
          await expect(summary).toBeVisible();
          await expect(summary.locator(":scope > article")).toHaveCount(4);
          await expect(
            workspace.locator('[data-staff-report-desktop="table"]'),
          ).toBeHidden();
          await expect(
            workspace.locator('[data-staff-report-mobile="cards"]'),
          ).toBeHidden();

          await expect(page.locator("html")).toHaveAttribute(
            "data-theme",
            theme,
          );
          await expectAuthenticatedCanvasParity(page);
          await expect(page.locator("[data-app-language]").first()).toHaveAttribute(
            "dir",
            locale === "ar" ? "rtl" : "ltr",
          );
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
          ).toBe(true);

          await page.screenshot({
            path: test.info().outputPath(
              `saas-shell-staff-reports-simple-${viewport.name}-${locale}-${theme}.png`,
            ),
            fullPage: true,
          });
        }
      }
    }

    await setAuthenticatedLanguage(page, "en");
    await signOut(page);
  });

  test("Staff reports ADVANCED preserves responsive staff detail across locale theme and viewport @desktop @pr-smoke", async ({
    page,
  }) => {
    await signIn(page, "manager-a");
    const route = `/businesses/${fixture.businessA}/reports/staff`;

    for (const viewport of [
      { width: 390, height: 844, name: "390" },
      { width: 1366, height: 768, name: "1366" },
    ] as const) {
      await page.setViewportSize(viewport);

      for (const locale of ["en", "ar"] as const) {
        await setAuthenticatedLanguage(page, locale);

        for (const theme of ["light", "dark"] as const) {
          await page.evaluate(
            (value) => localStorage.setItem("tanee-theme", value),
            theme,
          );
          const response = await page.goto(route);
          expect(response?.status()).toBe(200);

          const workspace = page.locator(
            '[data-staff-reports-workspace="true"]',
          );
          await expect(workspace).toBeVisible();
          await expect(workspace).toHaveAttribute(
            "data-experience-mode",
            "ADVANCED",
          );

          const filters = workspace.locator(
            '[data-staff-report-filters="true"]',
          );
          await expect(filters).toBeVisible();
          const summary = workspace.locator(
            '[data-staff-report-summary="true"]',
          );
          await expect(summary).toBeVisible();
          await expect(summary.locator(":scope > article")).toHaveCount(4);

          const desktopTable = workspace.locator(
            '[data-staff-report-desktop="table"]',
          );
          const mobileCards = workspace.locator(
            '[data-staff-report-mobile="cards"]',
          );
          if (viewport.width < 1024) {
            await expect(desktopTable).toBeHidden();
            await expect(mobileCards).toBeVisible();
            expect(await mobileCards.locator(":scope > article").count()).toBeGreaterThan(0);
          } else {
            await expect(mobileCards).toBeHidden();
            await expect(desktopTable).toBeVisible();
            expect(await desktopTable.locator("tbody tr").count()).toBeGreaterThan(0);
          }

          await expect(page.locator("html")).toHaveAttribute(
            "data-theme",
            theme,
          );
          await expectAuthenticatedCanvasParity(page);
          await expect(page.locator("[data-app-language]").first()).toHaveAttribute(
            "dir",
            locale === "ar" ? "rtl" : "ltr",
          );
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
          ).toBe(true);

          await page.screenshot({
            path: test.info().outputPath(
              `saas-shell-staff-reports-advanced-${viewport.name}-${locale}-${theme}.png`,
            ),
            fullPage: true,
          });
        }
      }
    }

    await setAuthenticatedLanguage(page, "en");
    await signOut(page);
  });

  test("Settings preserves bilingual responsive administration surfaces across locale theme and viewport @desktop @pr-smoke", async ({
    page,
  }) => {
    await signIn(page, "owner-a");
    const route = `/businesses/${fixture.businessA}/settings`;

    for (const viewport of [
      { width: 390, height: 844, name: "390" },
      { width: 1366, height: 768, name: "1366" },
    ] as const) {
      await page.setViewportSize(viewport);

      for (const locale of ["en", "ar"] as const) {
        await setAuthenticatedLanguage(page, locale);

        for (const theme of ["light", "dark"] as const) {
          await page.evaluate(
            (value) => localStorage.setItem("tanee-theme", value),
            theme,
          );
          const response = await page.goto(route);
          expect(response?.status()).toBe(200);

          const workspace = page.locator(
            '[data-settings-administration="true"]',
          );
          await expect(workspace).toBeVisible();
          await expect(
            workspace.getByRole("heading", {
              level: 1,
              name: locale === "ar" ? "إعدادات النشاط" : "Business settings",
              exact: true,
            }),
          ).toBeVisible();

          const subnav = page.locator(
            '[data-settings-subnavigation="true"]',
          );
          await expect(subnav).toBeVisible();
          await expect(subnav).toHaveAttribute(
            "dir",
            locale === "ar" ? "rtl" : "ltr",
          );
          await expect(
            subnav.getByRole("link", {
              name: locale === "ar" ? "الإعدادات العامة" : "General settings",
              exact: true,
            }),
          ).toBeVisible();
          await expect(
            subnav.getByRole("link", {
              name: locale === "ar" ? "واتساب" : "WhatsApp",
              exact: true,
            }),
          ).toBeVisible();

          const sectionLinks = workspace.locator(
            '[data-settings-section-links="true"] > a',
          );
          await expect(sectionLinks).toHaveCount(4);

          const planUsage = workspace.locator('[data-plan-usage="true"]');
          await expect(planUsage).toBeVisible();
          await expect(planUsage.locator(":scope > div + div > div")).toHaveCount(5);

          await expect(
            workspace.locator('[data-settings-profile="true"]'),
          ).toBeVisible();
          await expect(
            workspace.locator('[data-settings-operations="true"]'),
          ).toBeVisible();

          const integrations = workspace.locator(
            '[data-settings-integrations="true"]',
          );
          await expect(integrations).toBeVisible();
          await expect(integrations.locator(":scope > details")).toHaveCount(2);

          const cardDetails = workspace.locator(
            'details[data-settings-card-details="true"]',
          );
          await expect(cardDetails).toBeVisible();

          await expect(
            workspace.getByRole("heading", {
              level: 2,
              name: locale === "ar" ? "منطقة الخطر" : "Danger Zone",
              exact: true,
            }),
          ).toBeVisible();

          await expect(page.locator("html")).toHaveAttribute(
            "data-theme",
            theme,
          );
          await expect(page.locator("[data-app-language]").first()).toHaveAttribute(
            "dir",
            locale === "ar" ? "rtl" : "ltr",
          );
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
          ).toBe(true);

          await page.screenshot({
            path: test.info().outputPath(
              `saas-shell-settings-${viewport.name}-${locale}-${theme}.png`,
            ),
            fullPage: true,
          });
        }
      }
    }

    await setAuthenticatedLanguage(page, "en");
    await signOut(page);
  });

  test("Team and branches preserve administration surfaces across locale theme and viewport @desktop @pr-smoke", async ({
    page,
  }) => {
    await signIn(page, "owner-a");

    for (const viewport of [
      { width: 390, height: 844, name: "390" },
      { width: 1366, height: 768, name: "1366" },
    ] as const) {
      await page.setViewportSize(viewport);

      for (const locale of ["en", "ar"] as const) {
        await setAuthenticatedLanguage(page, locale);

        for (const theme of ["light", "dark"] as const) {
          await page.evaluate(
            (value) => localStorage.setItem("tanee-theme", value),
            theme,
          );

          const teamResponse = await page.goto(
            `/businesses/${fixture.businessA}/users`,
          );
          expect(teamResponse?.status()).toBe(200);
          const team = page.locator('[data-team-administration="true"]');
          await expect(team).toBeVisible();
          await expect(
            team.getByRole("heading", {
              level: 1,
              name: locale === "ar" ? "حسابات الفريق" : "Team accounts",
              exact: true,
            }),
          ).toBeVisible();
          await expect(team.locator('[data-team-filters="true"]')).toBeVisible();
          expect(await team.locator('[data-team-member="true"]').count()).toBeGreaterThan(0);
          await expect(team).toHaveAttribute("dir", locale === "ar" ? "rtl" : "ltr");
          await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
          ).toBe(true);
          await page.screenshot({
            path: test.info().outputPath(
              `saas-shell-team-${viewport.name}-${locale}-${theme}.png`,
            ),
            fullPage: true,
          });

          const branchesResponse = await page.goto(
            `/businesses/${fixture.businessA}/branches`,
          );
          expect(branchesResponse?.status()).toBe(200);
          const branches = page.locator(
            '[data-branches-administration="true"]',
          );
          await expect(branches).toBeVisible();
          await expect(
            branches.getByRole("heading", {
              level: 1,
              name:
                locale === "ar"
                  ? "الفروع والإسنادات"
                  : "Branches & assignments",
              exact: true,
            }),
          ).toBeVisible();
          await expect(branches.locator('[data-branch-card="true"]')).toHaveCount(3);
          await expect(
            branches.getByText(locale === "ar" ? "إضافة فرع" : "Add branch", {
              exact: true,
            }).first(),
          ).toBeVisible();
          await expect(page.locator("[data-app-language]").first()).toHaveAttribute(
            "dir",
            locale === "ar" ? "rtl" : "ltr",
          );
          await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
          ).toBe(true);
          await page.screenshot({
            path: test.info().outputPath(
              `saas-shell-branches-${viewport.name}-${locale}-${theme}.png`,
            ),
            fullPage: true,
          });
        }
      }
    }

    await setAuthenticatedLanguage(page, "en");
    await signOut(page);
  });

  test("Rewards SIMPLE preserves catalog truth while hiding advanced editors across locale theme and viewport @desktop @pr-smoke", async ({
    page,
  }) => {
    await signIn(page, "owner-a");
    await setAuthenticatedExperienceMode(page, "SIMPLE");
    const route = `/businesses/${fixture.businessA}/rewards`;

    for (const viewport of [
      { width: 390, height: 844, name: "390" },
      { width: 1366, height: 768, name: "1366" },
    ] as const) {
      await page.setViewportSize(viewport);

      for (const locale of ["en", "ar"] as const) {
        await setAuthenticatedLanguage(page, locale);

        for (const theme of ["light", "dark"] as const) {
          await page.evaluate(
            (value) => localStorage.setItem("tanee-theme", value),
            theme,
          );
          const response = await page.goto(route);
          expect(response?.status()).toBe(200);

          const shell = page.locator('main[data-growth-area="rewards"]');
          await expect(shell).toHaveAttribute("data-experience-growth", "simple");
          await expect(shell.locator("[data-reward-catalog-overview]")).toBeVisible();
          await expect(
            shell.getByRole("heading", {
              level: 2,
              name: locale === "ar" ? "مكتبة المكافآت" : "Reward library",
              exact: true,
            }),
          ).toBeVisible();
          await expect(shell.locator('[data-reward-card="true"]')).toHaveCount(3);
          await expect(shell.locator('[data-reward-create="true"]')).toHaveCount(0);
          await expect(shell.locator('[data-reward-edit="true"]')).toHaveCount(0);
          await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
          await expect(page.locator("[data-app-language]").first()).toHaveAttribute(
            "dir",
            locale === "ar" ? "rtl" : "ltr",
          );
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
          ).toBe(true);
          await page.screenshot({
            path: test.info().outputPath(
              `saas-shell-rewards-simple-${viewport.name}-${locale}-${theme}.png`,
            ),
            fullPage: true,
          });
        }
      }
    }

    await setAuthenticatedLanguage(page, "en");
    await signOut(page);
  });

  test("Rewards ADVANCED preserves catalog editors across locale theme and viewport @desktop @pr-smoke", async ({
    page,
  }) => {
    await signIn(page, "owner-a");
    await setAuthenticatedExperienceMode(page, "ADVANCED");
    const route = `/businesses/${fixture.businessA}/rewards`;

    for (const viewport of [
      { width: 390, height: 844, name: "390" },
      { width: 1366, height: 768, name: "1366" },
    ] as const) {
      await page.setViewportSize(viewport);

      for (const locale of ["en", "ar"] as const) {
        await setAuthenticatedLanguage(page, locale);

        for (const theme of ["light", "dark"] as const) {
          await page.evaluate(
            (value) => localStorage.setItem("tanee-theme", value),
            theme,
          );
          const response = await page.goto(route);
          expect(response?.status()).toBe(200);

          const shell = page.locator('main[data-growth-area="rewards"]');
          await expect(shell).toHaveAttribute("data-experience-growth", "advanced");
          await expect(shell.locator('[data-reward-card="true"]')).toHaveCount(3);
          await expect(shell.locator('[data-reward-create="true"]')).toBeVisible();
          await expect(shell.locator('[data-reward-edit="true"]')).toHaveCount(3);
          await expect(
            shell.locator('[data-reward-create="true"] summary'),
          ).toContainText(locale === "ar" ? "إضافة مكافأة" : "Add reward");
          await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
          await expect(page.locator("[data-app-language]").first()).toHaveAttribute(
            "dir",
            locale === "ar" ? "rtl" : "ltr",
          );
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
          ).toBe(true);
          await page.screenshot({
            path: test.info().outputPath(
              `saas-shell-rewards-advanced-${viewport.name}-${locale}-${theme}.png`,
            ),
            fullPage: true,
          });
        }
      }
    }

    await setAuthenticatedLanguage(page, "en");
    await signOut(page);
  });

  test("Offers SIMPLE preserves catalog truth while hiding advanced editors across locale theme and viewport @desktop @pr-smoke", async ({
    page,
  }) => {
    await signIn(page, "owner-a");
    await setAuthenticatedExperienceMode(page, "SIMPLE");
    const route = `/businesses/${fixture.businessA}/offers`;

    for (const viewport of [
      { width: 390, height: 844, name: "390" },
      { width: 1366, height: 768, name: "1366" },
    ] as const) {
      await page.setViewportSize(viewport);

      for (const locale of ["en", "ar"] as const) {
        await setAuthenticatedLanguage(page, locale);

        for (const theme of ["light", "dark"] as const) {
          await page.evaluate(
            (value) => localStorage.setItem("tanee-theme", value),
            theme,
          );
          const response = await page.goto(route);
          expect(response?.status()).toBe(200);

          const shell = page.locator('main[data-growth-area="offers"]');
          await expect(shell).toHaveAttribute("data-experience-growth", "simple");
          await expect(shell.locator('[data-offers-workspace="true"]')).toBeVisible();
          await expect(shell.locator('[data-offer-card="true"]')).toHaveCount(2);
          await expect(shell.locator('[data-offer-create="true"]')).toHaveCount(0);
          await expect(shell.locator('[data-offer-edit="true"]')).toHaveCount(0);
          await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
          await expect(page.locator("[data-app-language]").first()).toHaveAttribute(
            "dir",
            locale === "ar" ? "rtl" : "ltr",
          );
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
          ).toBe(true);
          await page.screenshot({
            path: test.info().outputPath(
              `saas-shell-offers-simple-${viewport.name}-${locale}-${theme}.png`,
            ),
            fullPage: true,
          });
        }
      }
    }

    await setAuthenticatedLanguage(page, "en");
    await signOut(page);
  });

  test("Offers ADVANCED preserves catalog editors across locale theme and viewport @desktop @pr-smoke", async ({
    page,
  }) => {
    await signIn(page, "owner-a");
    await setAuthenticatedExperienceMode(page, "ADVANCED");
    const route = `/businesses/${fixture.businessA}/offers`;

    for (const viewport of [
      { width: 390, height: 844, name: "390" },
      { width: 1366, height: 768, name: "1366" },
    ] as const) {
      await page.setViewportSize(viewport);

      for (const locale of ["en", "ar"] as const) {
        await setAuthenticatedLanguage(page, locale);

        for (const theme of ["light", "dark"] as const) {
          await page.evaluate(
            (value) => localStorage.setItem("tanee-theme", value),
            theme,
          );
          const response = await page.goto(route);
          expect(response?.status()).toBe(200);

          const shell = page.locator('main[data-growth-area="offers"]');
          await expect(shell).toHaveAttribute("data-experience-growth", "advanced");
          await expect(shell.locator('[data-offer-card="true"]')).toHaveCount(2);
          await expect(shell.locator('[data-offer-create="true"]')).toBeVisible();
          await expect(shell.locator('[data-offer-edit="true"]')).toHaveCount(2);
          await expect(
            shell.locator('[data-offer-create="true"] summary'),
          ).toContainText(locale === "ar" ? "إنشاء عرض جديد" : "Create a new offer");
          await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
          await expect(page.locator("[data-app-language]").first()).toHaveAttribute(
            "dir",
            locale === "ar" ? "rtl" : "ltr",
          );
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
          ).toBe(true);
          await page.screenshot({
            path: test.info().outputPath(
              `saas-shell-offers-advanced-${viewport.name}-${locale}-${theme}.png`,
            ),
            fullPage: true,
          });
        }
      }
    }

    await setAuthenticatedLanguage(page, "en");
    await signOut(page);
  });

  test("Account security preserves password session and alert surfaces across locale theme and viewport @desktop @pr-smoke", async ({
    page,
  }) => {
    await signIn(page, "owner-a");
    const route = "/account/security";

    for (const viewport of [
      { width: 390, height: 844, name: "390" },
      { width: 1366, height: 768, name: "1366" },
    ] as const) {
      await page.setViewportSize(viewport);

      for (const locale of ["en", "ar"] as const) {
        await setAuthenticatedLanguage(page, locale);

        for (const theme of ["light", "dark"] as const) {
          await page.evaluate(
            (value) => localStorage.setItem("tanee-theme", value),
            theme,
          );
          const response = await page.goto(route);
          expect(response?.status()).toBe(200);

          const workspace = page.locator(
            '[data-account-security-workspace="true"]',
          );
          await expect(workspace).toBeVisible();
          await expect(
            workspace.getByRole("heading", {
              level: 1,
              name: locale === "ar" ? "تغيير كلمة المرور" : "Change password",
              exact: true,
            }),
          ).toBeVisible();

          const passwordSection = workspace.locator(
            '[data-account-security-section="password"]',
          );
          const sessionsSection = workspace.locator(
            '[data-account-security-section="sessions"]',
          );
          const alertsSection = workspace.locator(
            '[data-account-security-section="alerts"]',
          );
          await expect(passwordSection).toBeVisible();
          await expect(sessionsSection).toBeVisible();
          await expect(alertsSection).toBeVisible();

          await expect(
            passwordSection.getByLabel(
              locale === "ar" ? "كلمة المرور الحالية" : "Current password",
              { exact: true },
            ),
          ).toHaveAttribute("dir", "ltr");
          await expect(
            passwordSection.getByLabel(
              locale === "ar" ? "كلمة المرور الجديدة" : "New password",
              { exact: true },
            ),
          ).toHaveAttribute("dir", "ltr");
          await expect(
            passwordSection.getByLabel(
              locale === "ar"
                ? "تأكيد كلمة المرور الجديدة"
                : "Confirm new password",
              { exact: true },
            ),
          ).toHaveAttribute("dir", "ltr");
          await expect(
            passwordSection.getByRole("button", {
              name: locale === "ar" ? "تغيير كلمة المرور" : "Change password",
              exact: true,
            }),
          ).toBeVisible();

          await expect(
            sessionsSection.getByRole("heading", {
              level: 2,
              name:
                locale === "ar"
                  ? "تسجيل الخروج من جميع الأجهزة"
                  : "Log out everywhere",
              exact: true,
            }),
          ).toBeVisible();
          await expect(
            sessionsSection.getByRole("button", {
              name:
                locale === "ar"
                  ? "تسجيل الخروج من جميع الأجهزة"
                  : "Log out everywhere",
              exact: true,
            }),
          ).toBeVisible();

          await expect(
            alertsSection.getByRole("heading", {
              level: 2,
              name:
                locale === "ar"
                  ? "آخر تنبيهات الأمان"
                  : "Recent security alerts",
              exact: true,
            }),
          ).toBeVisible();

          await expect(page.locator("html")).toHaveAttribute(
            "data-theme",
            theme,
          );
          await expect(page.locator("[data-app-language]").first()).toHaveAttribute(
            "dir",
            locale === "ar" ? "rtl" : "ltr",
          );
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
          ).toBe(true);

          await page.screenshot({
            path: test.info().outputPath(
              `saas-shell-account-security-${viewport.name}-${locale}-${theme}.png`,
            ),
            fullPage: true,
          });
        }
      }
    }

    await setAuthenticatedLanguage(page, "en");
    await signOut(page);
  });

  test("notification centre follows SaaS locale and theme @desktop @pr-smoke", async ({
    page,
  }) => {
    await signIn(page, "owner-a");
    const route = `/businesses/${fixture.businessA}`;

    for (const viewport of [
      { width: 390, height: 844, name: "390" },
      { width: 1366, height: 768, name: "1366" },
    ] as const) {
      await page.setViewportSize(viewport);
      await page.goto(route);

      for (const locale of ["en", "ar"] as const) {
        await setAuthenticatedLanguage(page, locale);

        for (const theme of ["light", "dark"] as const) {
          await page.evaluate(
            (value) => localStorage.setItem("tanee-theme", value),
            theme,
          );
          await page.goto(`${route}?notifications=1`);

          const dialog = page.getByTestId("business-notifications-dialog");
          const panel = page.getByTestId("business-notifications-panel");
          const localeShell = page.locator("[data-app-language]").first();

          await expect(dialog).toBeVisible();
          await expect(dialog).toHaveAttribute("aria-modal", "true");
          await expect(panel).toBeVisible();
          await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
          await expect(localeShell).toHaveAttribute(
            "data-app-language",
            locale === "ar" ? "AR" : "EN",
          );
          await expect(localeShell).toHaveAttribute(
            "dir",
            locale === "ar" ? "rtl" : "ltr",
          );
          expect(
            await panel.evaluate((node) => node.scrollWidth <= node.clientWidth),
          ).toBe(true);

          await page.screenshot({
            path: test.info().outputPath(
              `notification-centre-${viewport.name}-${locale}-${theme}.png`,
            ),
            fullPage: true,
          });

          await page
            .getByRole("button", {
              name: locale === "ar" ? "إغلاق التنبيهات" : "Close notifications",
              exact: true,
            })
            .click();
          await expect(dialog).toBeHidden();
        }
      }
    }

    await page.goto(route);
    await setAuthenticatedLanguage(page, "en");
  });

  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
  ] as const) {
    test(`marketing shell keeps exact desktop geometry at ${viewport.width}px across locale theme and routes @desktop @pr-smoke`, async ({
      page,
      context,
      baseURL,
    }) => {
      await page.setViewportSize(viewport);

      let variantBaseline: MarketingShellGeometry | null = null;
      for (const locale of ["en", "ar"] as const) {
        for (const theme of ["light", "dark"] as const) {
          await setMarketingVariant(
            page,
            context,
            baseURL!,
            "/faq",
            locale,
            theme,
          );

          const geometry = await captureMarketingShellGeometry(page);
          if (!variantBaseline) {
            variantBaseline = geometry;
          } else {
            expectMarketingShellGeometryMatch(
              geometry,
              variantBaseline,
              `${viewport.width}px /faq ${locale} ${theme}`,
            );
          }

          const header = page.getByTestId("marketing-header");
          const menuButton = header.locator(
            'button[aria-controls="marketing-mobile-menu"]',
          );
          await expect(menuButton).toBeHidden();
          await page.evaluate(() => window.scrollTo(0, 900));
          await expect(header).toHaveAttribute("data-header-visible", "true");
          await expect(header).toBeVisible();
          await page.evaluate(() => window.scrollTo(0, 0));

          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
          ).toBe(true);

          await page.screenshot({
            path: test.info().outputPath(
              `marketing-shell-${viewport.width}-${locale}-${theme}.png`,
            ),
            fullPage: true,
          });
        }
      }

      await setMarketingVariant(
        page,
        context,
        baseURL!,
        "/faq",
        "en",
        "light",
      );
      const routeBaseline = await captureMarketingShellGeometry(page);

      for (const route of MARKETING_SHELL_ROUTES) {
        const response = await page.goto(route);
        expect(response?.status(), route).toBe(200);
        await expect(page.locator("html")).toHaveAttribute(
          "data-marketing-theme",
          "light",
        );
        await expect(page.locator("main")).toHaveAttribute("dir", "ltr");

        const geometry = await captureMarketingShellGeometry(page);
        expectMarketingShellGeometryMatch(
          geometry,
          routeBaseline,
          `${viewport.width}px route ${route}`,
        );
      }

      for (const route of OPTIONAL_MARKETING_SHELL_ROUTES) {
        const response = await page.goto(route);
        expect([200, 404], route).toContain(response?.status());
        if (response?.status() === 404) continue;

        await expect(page.locator("html")).toHaveAttribute(
          "data-marketing-theme",
          "light",
        );
        await expect(page.locator("main")).toHaveAttribute("dir", "ltr");

        const geometry = await captureMarketingShellGeometry(page);
        expectMarketingShellGeometryMatch(
          geometry,
          routeBaseline,
          `${viewport.width}px optional route ${route}`,
        );
      }
    });
  }

  test("inline Tanee keeps the canonical A15 connected-ee geometry across rendered text sizes @desktop @pr-smoke", async ({
    page,
    context,
    baseURL,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    for (const locale of ["en", "ar"] as const) {
      for (const theme of ["light", "dark"] as const) {
        await setMarketingVariant(
          page,
          context,
          baseURL!,
          "/security",
          locale,
          theme,
        );

        const names = page.locator("[data-inline-tanee-name]");
        expect(await names.count()).toBeGreaterThan(1);

        const fontSizes = await names.evaluateAll((nodes) =>
          Array.from(
            new Set(
              nodes.map((node) =>
                Number.parseFloat(getComputedStyle(node).fontSize).toFixed(2),
              ),
            ),
          ),
        );
        expect(fontSizes.length).toBeGreaterThanOrEqual(2);

        const vectorChecks = await names.evaluateAll((nodes) =>
          nodes.map((node) => {
            const svg = node.querySelector<SVGSVGElement>(
              "[data-inline-tanee-ee-vector]",
            );
            const path = svg?.querySelector<SVGPathElement>("path");
            if (!svg || !path) return null;
            const box = path.getBBox();
            return {
              text: node.textContent,
              viewBox: svg.getAttribute("viewBox"),
              preserveAspectRatio: svg.getAttribute("preserveAspectRatio"),
              box: {
                x: box.x,
                y: box.y,
                width: box.width,
                height: box.height,
              },
            };
          }),
        );

        for (const check of vectorChecks) {
          expect(check).not.toBeNull();
          expect(check!.text).toContain("Tanee");
          expect(check!.viewBox).toBe("850 0 650 384");
          expect(check!.preserveAspectRatio).toBe("xMidYMid meet");
          expect(check!.box.x).toBeGreaterThanOrEqual(850);
          expect(check!.box.x).toBeLessThan(852);
          expect(check!.box.y).toBeGreaterThanOrEqual(83);
          expect(check!.box.y).toBeLessThan(86);
          expect(check!.box.x + check!.box.width).toBeGreaterThan(1498);
          expect(check!.box.y + check!.box.height).toBeGreaterThan(383);
        }

        await page.screenshot({
          path: test.info().outputPath(
            `marketing-inline-tanee-1440-${locale}-${theme}.png`,
          ),
          fullPage: true,
        });
      }
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
