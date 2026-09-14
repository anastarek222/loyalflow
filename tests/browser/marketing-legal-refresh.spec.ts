import { expect, test } from "@playwright/test";

for (const locale of ["en", "ar"] as const) {
  for (const theme of ["light", "dark"] as const) {
    for (const route of ["terms", "data-deletion"] as const) {
      test(`${route} ${locale} ${theme}: shared marketing legal shell @critical @desktop @mobile`, async ({
        page,
        context,
        baseURL,
      }) => {
        await context.addCookies([
          { name: "loyalflow_locale", value: locale, url: baseURL! },
        ]);
        await context.addInitScript(
          (value) => localStorage.setItem("tanee-marketing-theme", value),
          theme,
        );

        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        const response = await page.goto(`/${route}`);

        expect(response?.status()).toBe(200);
        await expect(page.locator("main")).toHaveAttribute(
          "dir",
          locale === "ar" ? "rtl" : "ltr",
        );
        await expect(page.locator("html")).toHaveAttribute(
          "data-marketing-theme",
          theme,
        );
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expect(page.locator("section article")).toHaveCount(
          route === "terms" ? 6 : 5,
        );
        await expect(page.locator(`footer a[href="/${route}"]`)).toHaveAttribute(
          "aria-current",
          "page",
        );
        await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
          "content",
          /noindex/,
        );
        if (route === "terms") {
          await expect(page.getByRole("status")).toBeVisible();
        } else {
          await expect(page.locator('a[href="/contact"]')).toBeVisible();
        }

        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        ).toBe(true);
        await page.evaluate(() => document.fonts.ready);
        await page.screenshot({
          path: test.info().outputPath(`${route}-${locale}-${theme}.png`),
          fullPage: true,
        });
        expect(errors).toEqual([]);
      });
    }
  }
}
