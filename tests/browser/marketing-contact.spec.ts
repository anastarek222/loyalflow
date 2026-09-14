import { expect, test } from "@playwright/test";

for (const locale of ["en", "ar"] as const) {
  for (const theme of ["light", "dark"] as const) {
    test(`Contact sales ${locale} ${theme}: booking and expert launcher @desktop @mobile`, async ({
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
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        locale === "en"
          ? "The right conversation can save you a lot of setup time."
          : "مكالمة صح ممكن توفّر عليك وقت كبير في تجهيز نشاطك.",
      );

      await expect(page.locator("#contact-options > div > a")).toHaveCount(3);
      await expect(page.locator("#book-meeting")).toBeVisible();
      await expect(page.locator('input[name="meetingMethod"]')).toHaveCount(6);
      await expect(page.locator('input[name="preferredDate"]')).toBeVisible();
      await expect(page.locator('input[name="preferredTime"]')).toBeVisible();
      await expect(
        page.locator('a[href="https://wa.me/17166571813"]').first(),
      ).toBeVisible();
      await expect(
        page.locator('a[href="mailto:tanee.eg.loyalty@gmail.com"]').first(),
      ).toBeVisible();

      const trigger = page.getByTestId("talk-to-expert-trigger");
      await expect(trigger).toBeVisible();
      await trigger.click();
      const panel = page.getByTestId("talk-to-expert-panel");
      await expect(panel).toBeVisible();
      await expect(panel.locator('a[href="/contact#book-meeting"]')).toBeVisible();
      await expect(panel.locator('a[href="/contact#whatsapp"]')).toBeVisible();
      await expect(
        panel.locator('a[href="/contact#contact-options"]'),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(panel).toBeHidden();

      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: test.info().outputPath(`contact-${locale}-${theme}.png`),
        fullPage: true,
      });
      expect(errors).toEqual([]);
    });
  }
}
