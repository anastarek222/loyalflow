import { expect, test } from "@playwright/test";

for (const locale of ["en", "ar"] as const) {
  for (const theme of ["light", "dark"] as const) {
    test(`FAQ ${locale} ${theme}: content, disclosure and shared shell @desktop @mobile`, async ({
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
      const response = await page.goto("/faq");
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
          ? "A little clarity before you start."
          : "إجابات واضحة قبل ما تبدأ.",
      );
      const items = page.locator("details");
      await expect(items).toHaveCount(9);
      await expect(page.locator("details[open]")).toHaveCount(1);
      await expect(items.first()).toHaveAttribute("open", "");

      const trial = items.nth(1);
      await trial.locator("summary").focus();
      await page.keyboard.press("Enter");
      await expect(trial.locator("p")).toBeVisible();
      await expect(trial.locator("p")).toContainText(
        locale === "en" ? "14 days" : "14 يومًا",
      );
      await page.keyboard.press("Space");
      await expect(trial.locator("p")).toBeHidden();
      for (const item of await items.all()) {
        if (
          !(await item.evaluate(
            (element) => (element as HTMLDetailsElement).open,
          ))
        ) {
          await item.locator("summary").click();
        }
        await expect(item.locator("p")).toBeVisible();
        expect(
          (await item.locator("p").innerText()).trim().length,
        ).toBeGreaterThan(20);
      }
      for (const item of (await items.all()).slice(1))
        await item.locator("summary").click();
      await expect(page.locator('footer a[href="/faq"]')).toHaveAttribute(
        "aria-current",
        "page",
      );
      const contact = page.locator('section[aria-labelledby="faq-contact"]');
      await expect(
        contact.locator('a[href="https://wa.me/17166571813"]'),
      ).toBeVisible();
      await expect(
        contact.locator('a[href="mailto:tanee.eg.loyalty@gmail.com"]'),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: test.info().outputPath(`faq-${locale}-${theme}.png`),
        fullPage: true,
      });
      expect(errors).toEqual([]);
    });

    test(`Security & Privacy ${locale} ${theme}: content and shared shell @desktop @mobile`, async ({
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

      const response = await page.goto("/security");
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
          ? "Your customer relationships deserve thoughtful care."
          : "علاقاتك مع عملائك تستحق الاهتمام.",
      );

      const cards = page.locator("section article");
      await expect(cards).toHaveCount(3);
      await expect(page.locator('a[href="/privacy"]')).toBeVisible();
      await expect(page.locator('a[href="/terms"]')).toBeVisible();
      await expect(page.locator('a[href="#privacy"]')).toHaveCount(0);
      await expect(page.locator('a[href="#terms"]')).toHaveCount(0);

      const securityContact = page.locator(
        'section[aria-labelledby="security-contact"]',
      );
      await expect(
        securityContact.locator('a[href="https://wa.me/17166571813"]'),
      ).toBeVisible();
      await expect(
        securityContact.locator('a[href="mailto:tanee.eg.loyalty@gmail.com"]'),
      ).toBeVisible();
      await expect(page.locator('footer a[href="/security"]')).toHaveAttribute(
        "aria-current",
        "page",
      );

      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({
        path: test.info().outputPath(`faq-security-${locale}-${theme}.png`),
        fullPage: true,
      });
      expect(errors).toEqual([]);
    });
  }
}
