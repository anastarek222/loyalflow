import { expect, test, type Locator } from "@playwright/test";

async function expectSameRow(locator: Locator) {
  const tops = await locator.evaluateAll((nodes) =>
    nodes.map((node) => Math.round(node.getBoundingClientRect().top)),
  );
  expect(tops.length).toBeGreaterThan(1);
  expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(2);
}

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

      const contactOptions = page.locator("#contact-options > div > a");
      await expect(contactOptions).toHaveCount(3);
      await expectSameRow(contactOptions);

      const bookingSection = page.locator("#book-meeting");
      await expect(bookingSection).toBeVisible();
      await expect(bookingSection).toHaveAttribute("tabindex", "-1");
      await expect(page.locator('input[name="meetingMethod"]')).toHaveCount(3);
      await expectSameRow(page.locator("#book-meeting fieldset > div > label"));

      const meetingDate = page.getByTestId("meeting-date");
      await expect(meetingDate).toBeVisible();
      const minimumDate = await meetingDate.getAttribute("min");
      expect(minimumDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      await expect(meetingDate).toHaveValue(minimumDate!);

      const meetingTime = page.getByTestId("meeting-time");
      await expect(meetingTime).toBeVisible();
      await expect(meetingTime.locator('option[value="15:00"]')).toHaveCount(1);
      await expect(meetingTime.locator('option[value="00:00"]')).toHaveCount(1);
      await expect(page.getByText("Africa/Cairo", { exact: false })).toBeVisible();

      await expect(
        page.locator('a[href="https://wa.me/17166571813"]').first(),
      ).toBeVisible();
      await expect(
        page.locator('a[href="mailto:tanee.eg.loyalty@gmail.com"]').first(),
      ).toBeVisible();

      const teaser = page.getByTestId("talk-to-expert-teaser");
      await expect(teaser).toBeVisible();
      await expect(teaser).toContainText(
        locale === "en" ? "Book your meeting" : "احجز اجتماعك",
      );

      const trigger = page.getByTestId("talk-to-expert-trigger");
      await expect(trigger).toBeVisible();
      await trigger.click();
      const panel = page.getByTestId("talk-to-expert-panel");
      await expect(panel).toBeVisible();
      const quickActions = panel.locator(
        '[data-testid="talk-to-expert-actions"] > a',
      );
      await expect(quickActions).toHaveCount(3);
      await expectSameRow(quickActions);
      await expect(panel.locator('a[href="/contact#book-meeting"]')).toBeVisible();
      await expect(panel.locator('a[href="/contact#whatsapp"]')).toBeVisible();
      await expect(
        panel.locator('a[href="/contact#contact-options"]'),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(panel).toBeHidden();

      if ((page.viewportSize()?.width ?? 1440) < 1280) {
        const mobileMenuButton = page.locator(
          'button[aria-controls="marketing-mobile-menu"]',
        );
        await mobileMenuButton.click();
        const drawer = page.locator("#marketing-mobile-menu");
        await expect(drawer).toBeVisible();
        const foreground = await drawer.evaluate(
          (node) => getComputedStyle(node).color,
        );
        const background = await drawer.evaluate(
          (node) => getComputedStyle(node).backgroundColor,
        );
        expect(foreground).not.toBe(background);
        await page.keyboard.press("Escape");
        await expect(drawer).toBeHidden();
      }

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
