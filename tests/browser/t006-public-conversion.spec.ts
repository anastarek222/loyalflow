import { expect, test } from "@playwright/test";

async function expectLocale(page: import("@playwright/test").Page, locale: "en" | "ar", direction: "ltr" | "rtl") {
  const main = page.locator("main");
  await expect(main).toHaveAttribute("lang", locale);
  await expect(main).toHaveAttribute("dir", direction);
}

test("@desktop public marketing routes into the supported conversion selector", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/");

  await expectLocale(page, "en", "ltr");

  const getStarted = page.locator('a[href="/get-started"]');
  await expect(getStarted).toHaveCount(1);
  await getStarted.click();
  await expect(page).toHaveURL(/\/get-started$/);

  await expect(page.locator('a[href="/login"]')).toHaveCount(1);
  await expect(page.locator('a[href="/accept-owner-invitation"]')).toHaveCount(1);
  await expect(page.locator('a[href*="signup"], a[href*="payment"], a[href*="checkout"]')).toHaveCount(0);
});

test("@desktop public conversion selector switches from English LTR to Arabic RTL", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/get-started");

  await expectLocale(page, "en", "ltr");

  const languageSwitcher = page.locator('[aria-label="Language"]');
  await expect(languageSwitcher).toBeVisible();
  await languageSwitcher.getByRole("button", { name: "العربية" }).click();

  await expectLocale(page, "ar", "rtl");
  await expect(page.locator('a[href="/login"]')).toHaveCount(1);
  await expect(page.locator('a[href="/accept-owner-invitation"]')).toHaveCount(1);
});

test("@mobile public marketing and conversion paths remain usable on a narrow viewport", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/");

  await expectLocale(page, "en", "ltr");
  const getStarted = page.locator('a[href="/get-started"]');
  await expect(getStarted).toBeVisible();
  await getStarted.click();

  await expect(page).toHaveURL(/\/get-started$/);
  await expect(page.locator('a[href="/login"]')).toBeVisible();
  await expect(page.locator('a[href="/accept-owner-invitation"]')).toBeVisible();

  const mainBox = await page.locator("main").boundingBox();
  expect(mainBox?.width ?? 0).toBeLessThanOrEqual(390);
});
