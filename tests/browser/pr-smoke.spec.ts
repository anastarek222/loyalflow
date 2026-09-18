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
