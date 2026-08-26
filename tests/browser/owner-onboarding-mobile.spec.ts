import { expect, test } from "@playwright/test";

import {
  cleanupBrowserUat,
  prepareBrowserUat,
  type BrowserUatFixture,
  uatEmail,
} from "./fixtures";

let fixture: BrowserUatFixture;
let manifestPath: string;

test.describe
  .serial("Owner onboarding mobile transition @owner-onboarding", () => {
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

  test("pending Owner completes setup, launches, and re-enters the one Business directly", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const diagnostics: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "debug") diagnostics.push(message.text());
    });

    await page.goto("/login");
    await page
      .getByLabel("Email address")
      .fill(uatEmail("pending-owner", fixture.runId));
    await page.getByLabel("Password").fill(process.env.UAT_FIXTURE_PASSWORD!);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/onboarding$/, { timeout: 20_000 });

    const form = page.locator("form[data-owner-step]");
    await expect(form).toHaveAttribute("data-owner-step", "1");
    await expect(form).toHaveAttribute("data-owner-hydrated", "true");

    const country = page.getByRole("combobox", { name: "Country" });
    await country.click();
    await expect(page.getByRole("listbox")).toBeVisible();
    await country.press("Escape");
    await expect(page.getByRole("listbox")).toHaveCount(0);

    await country.fill("EG");
    await expect(
      page.locator('input[type="hidden"][name="country"]'),
    ).toHaveValue("Egypt");
    await expect(page.getByRole("listbox")).toHaveCount(0);

    await page.getByPlaceholder("Business name").fill("");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Enter a business name" }),
    ).toBeVisible();
    await expect(form).toHaveAttribute("data-owner-step", "1");

    const businessName = `LoyalFlow final UAT O ${fixture.runId}`;
    const businessSlug = `loyalflow-final-uat-o-${fixture.runId}`;
    await page.getByPlaceholder("Business name").fill(businessName);
    await country.click();
    await expect(page.getByRole("listbox")).toBeVisible();
    await page.getByRole("button", { name: "Next", exact: true }).click();

    await expect(form).toHaveAttribute("data-owner-step", "2");
    const mobileHeading = page
      .getByTestId("owner-mobile-step-header")
      .getByRole("heading", { name: "Loyalty Program", exact: true });
    await expect(mobileHeading).toBeVisible();
    await expect(mobileHeading).toBeFocused();
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const heading = document.querySelector(
            '[data-testid="owner-mobile-step-header"] h1',
          );
          if (!heading) return false;
          const rect = heading.getBoundingClientRect();
          return rect.top >= 0 && rect.bottom <= window.innerHeight;
        }),
      )
      .toBe(true);

    for (const checkpoint of [
      "OWNER_NEXT_CLICK",
      "OWNER_STEP1_VALID",
      "OWNER_STEP_CHANGE_2",
      "OWNER_STEP_RENDER_2",
    ]) {
      expect(diagnostics).toContain(checkpoint);
    }

    // Remote exact-SHA UAT reuses one prepared manifest across Chromium and
    // WebKit. Keep that shared runtime check mutation-free; the disposable PR
    // database executes and cleans the complete launch receipt below.
    if (process.env.STAGING_UAT_MANIFEST_PATH?.trim()) return;

    for (const step of [3, 4, 5, 6]) {
      await page.getByRole("button", { name: "Next", exact: true }).click();
      await expect(form).toHaveAttribute("data-owner-step", String(step));
    }

    await page.getByRole("button", { name: "Launch", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/businesses/${businessSlug}$`), {
      timeout: 30_000,
    });
    await expect(
      page.locator("#app-content").getByRole("heading", { level: 1 }),
    ).toHaveCount(1);

    await page
      .getByRole("button", { name: "Account menu", exact: true })
      .click();
    await Promise.all([
      page.waitForURL(/\/login$/),
      page.getByRole("button", { name: "Log out", exact: true }).click(),
    ]);

    await page
      .getByLabel("Email address")
      .fill(uatEmail("pending-owner", fixture.runId));
    await page.getByLabel("Password").fill(process.env.UAT_FIXTURE_PASSWORD!);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/businesses/${businessSlug}$`), {
      timeout: 20_000,
    });
    await expect(page).not.toHaveURL(/\/onboarding$/);
  });
});
