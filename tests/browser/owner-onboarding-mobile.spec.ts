import { expect, test } from "@playwright/test";

import {
  cleanupBrowserUat,
  prepareBrowserUat,
  type BrowserUatFixture,
  uatEmail,
} from "./fixtures";

let fixture: BrowserUatFixture;
let manifestPath: string;

test.describe.serial("Owner onboarding mobile transition @owner-onboarding", () => {
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

  test("valid Step 1 visibly advances and closes the country selector", async ({
    page,
  }) => {
    const diagnostics: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "debug") diagnostics.push(message.text());
    });

    await page.goto("/login");
    await page
      .getByLabel("Email address")
      .fill(uatEmail("pending-owner", fixture.runId));
    await page
      .getByLabel("Password")
      .fill(process.env.UAT_FIXTURE_PASSWORD!);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/onboarding$/);

    const form = page.locator("form[data-owner-step]");
    await expect(form).toHaveAttribute("data-owner-step", "1");
    await expect(form).toHaveAttribute("data-owner-hydrated", "true");

    const country = page.getByRole("combobox", { name: "Country" });
    await country.click();
    await expect(page.getByRole("listbox")).toBeVisible();
    await country.press("Escape");
    await expect(page.getByRole("listbox")).toHaveCount(0);

    await country.fill("EG");
    await expect(page.locator('input[type="hidden"][name="country"]')).toHaveValue(
      "Egypt",
    );
    await expect(page.getByRole("listbox")).toHaveCount(0);

    await page.getByPlaceholder("Business name").fill("");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Enter a business name" }),
    ).toBeVisible();
    await expect(form).toHaveAttribute("data-owner-step", "1");

    await page.getByPlaceholder("Business name").fill("Mobile Safari Studio");
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
  });
});
