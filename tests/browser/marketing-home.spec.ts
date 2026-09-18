import { expect, test } from "@playwright/test";

const copy = {
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
    test(\`Home \${locale} \${theme}: narrative, responsive composition and shared shell @desktop @mobile\`, async ({
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
      await expect(hero).toHaveText(copy[locale].hero);
      await expect(
        page.getByText(copy[locale].preview, { exact: true }).first(),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { level: 2, name: copy[locale].problem }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", {
          level: 2,
          name: copy[locale].relationship,
        }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { level: 2, name: copy[locale].journey }),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { level: 2, name: copy[locale].final }),
      ).toBeVisible();

      const trialLinks = page.locator('a[href="/get-started"]');
      await expect(trialLinks.first()).toBeVisible();
      expect(await trialLinks.count()).toBeGreaterThanOrEqual(2);
      await expect(
        page.locator('a[href="/how-it-works"]').first(),
      ).toBeVisible();
      await expect(page.locator("footer")).toBeVisible();

      const heroSection = hero.locator("xpath=ancestor::section[1]");
      const heroPreview = heroSection
        .locator("[aria-label]")
        .filter({ has: page.getByText(copy[locale].preview, { exact: true }) })
        .first();
      await expect(heroPreview).toBeVisible();

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
        .getByRole("heading", { level: 2, name: copy[locale].relationship })
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
          .outputPath(\`home-\${locale}-\${theme}-\${project}.png\`),
        fullPage: true,
      });

      expect(errors).toEqual([]);
    });
  }
}
