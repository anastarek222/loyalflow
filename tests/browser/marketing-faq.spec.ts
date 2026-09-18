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
      const policyCard = cards.nth(2);
      await expect(policyCard.locator('a[href="/privacy"]')).toBeVisible();
      await expect(policyCard.locator('a[href="/terms"]')).toBeVisible();
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

    test(`Privacy Policy ${locale} ${theme}: draft content and shared shell @desktop @mobile`, async ({
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

      const response = await page.goto("/privacy");
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
        locale === "en" ? "Privacy Policy" : "سياسة الخصوصية",
      );
      await expect(
        page.getByText(
          locale === "en"
            ? "Draft — pending content review"
            : "مسودة — المحتوى قيد المراجعة",
          { exact: true },
        ),
      ).toBeVisible();
      await expect(page.locator("article section h2")).toHaveCount(9);
      await expect(page.locator('section#cookies a[href="#cookies"]')).toHaveText(
        locale === "en"
          ? "Cookie Policy"
          : "سياسة ملفات تعريف الارتباط",
      );
      await expect(
        page.locator('article a[href="mailto:tanee.eg.loyalty@gmail.com"]'),
      ).toBeVisible();
      await expect(page.locator('footer a[href="/privacy"]')).toHaveAttribute(
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
        path: test.info().outputPath(`faq-privacy-${locale}-${theme}.png`),
        fullPage: true,
      });
      expect(errors).toEqual([]);
    });
  }
}

const homeCopy = {
  en: {
    hero: "Tanee helps your customers choose you again.",
    problem:
      "A customer may buy from you once. That does not mean they will choose you again.",
    relationship: "From every interaction to a stronger relationship.",
    journey: "A simple journey for you and your customers.",
    final: "Give your customers a clear reason to choose you again.",
    preview: "Tanee product preview",
  },
  ar: {
    hero: "Tanee تساعد عملاءك يختاروك تاني.",
    problem: "العميل ممكن يتعامل معاك مرة، لكن ده مش معناه إنه هيختارك تاني.",
    relationship: "من كل تعامل... لعلاقة أقوى.",
    journey: "رحلة بسيطة ليك ولعملائك.",
    final: "ادّي عملاءك سببًا واضحًا يختاروك تاني.",
    preview: "معاينة منتج Tanee",
  },
} as const;

for (const locale of ["en", "ar"] as const) {
  for (const theme of ["light", "dark"] as const) {
    test(`Home ${locale} ${theme}: narrative, responsive composition and shared shell @desktop @mobile`, async ({
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

      const response = await page.goto("/");
      expect(response?.status()).toBe(200);

      await expect(page.locator("main")).toHaveAttribute(
        "dir",
        locale === "ar" ? "rtl" : "ltr",
      );
      await expect(page.locator("html")).toHaveAttribute(
        "data-marketing-theme",
        theme,
      );

      const hero = page.getByRole("heading", { level: 1 });
      await expect(hero).toHaveText(homeCopy[locale].hero);
      await expect(
        page.getByRole("heading", { level: 2, name: homeCopy[locale].problem }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", {
          level: 2,
          name: homeCopy[locale].relationship,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { level: 2, name: homeCopy[locale].journey }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { level: 2, name: homeCopy[locale].final }),
      ).toBeVisible();

      const trialLinks = page.locator('a[href="/get-started"]');
      await expect(trialLinks.first()).toBeVisible();
      expect(await trialLinks.count()).toBeGreaterThanOrEqual(2);
      await expect(
        page.locator('a[href="/how-it-works"]').first(),
      ).toBeVisible();
      await expect(page.locator("footer")).toBeVisible();

      const heroSection = hero.locator("xpath=ancestor::section[1]");
      const heroPreview = heroSection.locator(
        '[data-marketing-product-preview="true"]',
      );
      await expect(heroPreview).toBeVisible();
      await expect(heroPreview).toHaveAttribute(
        "aria-label",
        homeCopy[locale].preview,
      );

      const heroBox = await hero.boundingBox();
      const previewBox = await heroPreview.boundingBox();
      expect(heroBox).not.toBeNull();
      expect(previewBox).not.toBeNull();

      const viewport = page.viewportSize();
      expect(viewport).not.toBeNull();
      if (viewport!.width >= 1024) {
        expect(Math.abs(heroBox!.y - previewBox!.y)).toBeLessThan(180);
        if (locale === "ar") {
          expect(heroBox!.x).toBeGreaterThan(previewBox!.x);
        } else {
          expect(heroBox!.x).toBeLessThan(previewBox!.x);
        }
      } else {
        expect(previewBox!.y).toBeGreaterThan(heroBox!.y);
      }

      const relationshipItems = page
        .getByRole("heading", { level: 2, name: homeCopy[locale].relationship })
        .locator("xpath=following::ol[1]/li");
      await expect(relationshipItems).toHaveCount(5);

      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);

      await page.evaluate(() => document.fonts.ready);

      const project = test.info().project.name.startsWith("mobile")
        ? "mobile"
        : "desktop";
      await page.screenshot({
        path: test
          .info()
          .outputPath(`faq-home-${locale}-${theme}-${project}.png`),
        fullPage: true,
      });

      expect(errors).toEqual([]);
    });
  }
}
