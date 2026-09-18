import { expect, test, type Locator } from "@playwright/test";

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


const marketingShellRoutes = [
  "/",
  "/features",
  "/how-it-works",
  "/pricing",
  "/about",
  "/faq",
  "/contact",
  "/security",
  "/privacy",
  "/terms",
  "/data-deletion",
  "/get-started",
  "/demo",
] as const;

type ShellRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

async function readShellRect(locator: Locator): Promise<ShellRect> {
  return locator.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    };
  });
}

async function readShellRects(locator: Locator): Promise<ShellRect[]> {
  return locator.evaluateAll((nodes) =>
    nodes.map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      };
    }),
  );
}

function expectSameRect(
  actual: ShellRect,
  expected: ShellRect,
  axes: readonly (keyof ShellRect)[] = ["x", "y", "width", "height"],
) {
  for (const axis of axes) {
    expect(actual[axis]).toBeCloseTo(expected[axis], 1);
  }
}

for (const viewport of [
  { width: 1366, height: 768, name: "1366" },
  { width: 1440, height: 900, name: "1440" },
] as const) {
  test(`Marketing desktop shell keeps exact geometry at ${viewport.name}px @desktop`, async ({
    page,
    context,
    baseURL,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");

    let shellBaseline:
      | {
          brand: ShellRect;
          nav: ShellRect;
          actions: ShellRect;
          actionSlots: ShellRect[];
          links: ShellRect[];
          footerShell: Pick<ShellRect, "x" | "width">;
          footerBrand: Pick<ShellRect, "x" | "width">;
          footerNav: Pick<ShellRect, "x" | "width">;
          footerActions: Pick<ShellRect, "x" | "width">;
          footerActionSlots: ShellRect[];
        }
      | undefined;

    for (const locale of ["en", "ar"] as const) {
      await context.addCookies([
        { name: "loyalflow_locale", value: locale, url: baseURL! },
      ]);

      for (const theme of ["light", "dark"] as const) {
        await page.evaluate(
          (value) => localStorage.setItem("tanee-marketing-theme", value),
          theme,
        );

        const routes =
          theme === "light" ? marketingShellRoutes : (["/"] as const);

        for (const route of routes) {
          const response = await page.goto(route);
          expect(response?.status(), route).toBe(200);
          await expect(page.locator("html")).toHaveAttribute(
            "data-marketing-theme",
            theme,
          );

          const brand = await readShellRect(
            page.locator('[data-marketing-header-brand="true"]'),
          );
          const navLocator = page.locator(
            '[data-marketing-header-nav="true"]',
          );
          const nav = await readShellRect(navLocator);
          const actions = await readShellRect(
            page.locator('[data-marketing-header-actions="true"]'),
          );
          const actionSlots = await readShellRects(
            page.locator(
              '[data-marketing-header-theme-slot="true"], [data-marketing-header-language-slot="true"], [data-marketing-header-signin-slot="true"], [data-marketing-header-cta-slot="true"]',
            ),
          );
          expect(actionSlots).toHaveLength(4);
          const links = await navLocator.locator(":scope > a").evaluateAll(
            (nodes) =>
              nodes.map((node) => {
                const rect = node.getBoundingClientRect();
                return {
                  x: rect.x,
                  y: rect.y,
                  width: rect.width,
                  height: rect.height,
                };
              }),
          );
          expect(links, `${route} nav slots`).toHaveLength(7);
          expect(
            await navLocator.locator(":scope > a").evaluateAll((nodes) =>
              nodes.every(
                (node) => node.scrollWidth <= node.clientWidth,
              ),
            ),
            `${route} navigation text must stay inside fixed slots`,
          ).toBe(true);
          expect(
            await page
              .locator(
                '[data-marketing-header-theme-slot="true"], [data-marketing-header-language-slot="true"], [data-marketing-header-signin-slot="true"], [data-marketing-header-cta-slot="true"]',
              )
              .evaluateAll((nodes) =>
                nodes.every(
                  (node) => node.scrollWidth <= node.clientWidth,
                ),
              ),
            `${route} header actions must stay inside fixed slots`,
          ).toBe(true);

          const footerShellRect = await readShellRect(
            page.locator('[data-marketing-footer-shell="true"]'),
          );
          const footerBrandRect = await readShellRect(
            page.locator('[data-marketing-footer-brand="true"]'),
          );
          const footerNavRect = await readShellRect(
            page.locator('[data-marketing-footer-navigation="true"]'),
          );
          const footerActionsRect = await readShellRect(
            page.locator('[data-marketing-footer-actions="true"]'),
          );
          const footerActionSlots = (
            await readShellRects(
              page.locator(
                '[data-marketing-footer-theme-slot="true"], [data-marketing-footer-language-slot="true"], [data-marketing-footer-access-slot="true"]',
              ),
            )
          ).map((rect) => ({
            ...rect,
            y: rect.y - footerActionsRect.y,
          }));
          expect(footerActionSlots).toHaveLength(3);
          expect(
            await page
              .locator(
                '[data-marketing-footer-theme-slot="true"], [data-marketing-footer-language-slot="true"], [data-marketing-footer-access-slot="true"]',
              )
              .evaluateAll((nodes) =>
                nodes.every(
                  (node) => node.scrollWidth <= node.clientWidth,
                ),
              ),
            `${route} footer controls must stay inside fixed slots`,
          ).toBe(true);

          const current = {
            brand,
            nav,
            actions,
            actionSlots,
            links,
            footerShell: {
              x: footerShellRect.x,
              width: footerShellRect.width,
            },
            footerBrand: {
              x: footerBrandRect.x,
              width: footerBrandRect.width,
            },
            footerNav: {
              x: footerNavRect.x,
              width: footerNavRect.width,
            },
            footerActions: {
              x: footerActionsRect.x,
              width: footerActionsRect.width,
            },
            footerActionSlots,
          };

          if (!shellBaseline) {
            shellBaseline = current;
          } else {
            expectSameRect(current.brand, shellBaseline.brand);
            expectSameRect(current.nav, shellBaseline.nav);
            expectSameRect(current.actions, shellBaseline.actions);
            for (let index = 0; index < current.actionSlots.length; index += 1) {
              expectSameRect(
                current.actionSlots[index],
                shellBaseline.actionSlots[index],
              );
            }
            for (let index = 0; index < current.links.length; index += 1) {
              expectSameRect(current.links[index], shellBaseline.links[index]);
            }
            expect(current.footerShell.x).toBeCloseTo(
              shellBaseline.footerShell.x,
              1,
            );
            expect(current.footerShell.width).toBeCloseTo(
              shellBaseline.footerShell.width,
              1,
            );
            expect(current.footerBrand.x).toBeCloseTo(
              shellBaseline.footerBrand.x,
              1,
            );
            expect(current.footerBrand.width).toBeCloseTo(
              shellBaseline.footerBrand.width,
              1,
            );
            expect(current.footerNav.x).toBeCloseTo(
              shellBaseline.footerNav.x,
              1,
            );
            expect(current.footerNav.width).toBeCloseTo(
              shellBaseline.footerNav.width,
              1,
            );
            expect(current.footerActions.x).toBeCloseTo(
              shellBaseline.footerActions.x,
              1,
            );
            expect(current.footerActions.width).toBeCloseTo(
              shellBaseline.footerActions.width,
              1,
            );
            for (
              let index = 0;
              index < current.footerActionSlots.length;
              index += 1
            ) {
              expectSameRect(
                current.footerActionSlots[index],
                shellBaseline.footerActionSlots[index],
              );
            }
          }

          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
          ).toBe(true);

          if (route === "/") {
            await page.screenshot({
              path: test
                .info()
                .outputPath(
                  `marketing-shell-${viewport.name}-${locale}-${theme}.png`,
                ),
              fullPage: true,
            });
          }
        }
      }
    }
  });
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
      expect(await trialLinks.count()).toBeGreaterThanOrEqual(2);
      await expect(page.locator("footer")).toBeVisible();

      const heroSection = hero.locator("xpath=ancestor::section[1]");
      await expect(
        heroSection.locator('a[href="/get-started"]'),
      ).toBeVisible();
      await expect(
        heroSection.locator('a[href="/how-it-works"]'),
      ).toBeVisible();
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

const featuresCopy = {
  en: {
    title: "Everything you need to turn customer activity into lasting loyalty.",
    overview: "One connected loyalty experience for you and your customers.",
    brand: "A loyalty experience that looks and feels like your business.",
    activity: "Understand each customer beyond a single transaction.",
    rewards: "Reward continued loyalty in a way that fits your business.",
    insights: "See what keeps customers engaged.",
    journey: "Every capability works as part of one relationship.",
    security: "Your customer relationships and business data remain yours.",
    outcomes: "More reasons for customers to choose you again.",
    faq: "Frequently asked questions about Tanee features",
    final: "Bring your customer relationships together with Tanee.",
    card: "A loyalty card that carries your brand",
    preview: "Tanee product preview",
  },
  ar: {
    title: "كل ما تحتاجه لتحوّل تفاعل عملائك إلى ولاء مستمر.",
    overview: "تجربة ولاء واحدة ومترابطة لك ولعملائك.",
    brand: "تجربة ولاء تعكس هوية نشاطك.",
    activity: "افهم كل عميل بصورة تتجاوز عملية واحدة.",
    rewards: "كافئ ولاء عملائك بالطريقة التي تناسب نشاطك.",
    insights: "اعرف ما يشجّع عملاءك على الاستمرار.",
    journey: "كل ميزة تعمل ضمن تجربة واحدة مترابطة.",
    security: "علاقاتك بعملائك وبيانات نشاطك تظل ملكك.",
    outcomes: "امنح عملاءك أسبابًا أكثر ليختاروك من جديد.",
    faq: "الأسئلة الشائعة عن مزايا Tanee",
    final: "اجمع علاقات عملائك في تجربة واحدة مع Tanee.",
    card: "بطاقة ولاء تحمل هوية نشاطك",
    preview: "معاينة منتج Tanee",
  },
} as const;

for (const locale of ["en", "ar"] as const) {
  for (const theme of ["light", "dark"] as const) {
    test(`Features ${locale} ${theme}: narrative, previews and responsive composition @desktop @mobile`, async ({
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

      const response = await page.goto("/features");
      expect(response?.status()).toBe(200);
      await expect(page.locator("main")).toHaveAttribute(
        "dir",
        locale === "ar" ? "rtl" : "ltr",
      );
      await expect(page.locator("html")).toHaveAttribute(
        "data-marketing-theme",
        theme,
      );

      const hero = page.getByRole("heading", {
        level: 1,
        name: featuresCopy[locale].title,
      });
      await expect(hero).toBeVisible();

      for (const heading of [
        featuresCopy[locale].overview,
        featuresCopy[locale].brand,
        featuresCopy[locale].activity,
        featuresCopy[locale].rewards,
        featuresCopy[locale].insights,
        featuresCopy[locale].journey,
        featuresCopy[locale].security,
        featuresCopy[locale].outcomes,
      ]) {
        await expect(
          page.getByRole("heading", { level: 2, name: heading }),
        ).toBeVisible();
      }

      const heroSection = hero.locator("xpath=ancestor::section[1]");
      await expect(
        heroSection.locator('a[href="/get-started"]'),
      ).toBeVisible();
      await expect(
        heroSection.locator('a[href="/how-it-works"]'),
      ).toBeVisible();

      const heroPreview = heroSection.locator(
        '[data-marketing-product-preview="true"]',
      );
      await expect(heroPreview).toBeVisible();
      await expect(heroPreview).toHaveAttribute(
        "aria-label",
        featuresCopy[locale].preview,
      );

      await expect(
        page.getByRole("img", { name: featuresCopy[locale].card }),
      ).toBeVisible();
      await expect(
        page.getByRole("img", { name: featuresCopy[locale].rewards }),
      ).toBeVisible();
      await expect(
        page.getByRole("img", { name: featuresCopy[locale].insights }),
      ).toBeVisible();

      const faqItems = page.locator("details");
      await expect(faqItems).toHaveCount(6);
      const faqSection = faqItems.first().locator("xpath=ancestor::section[1]");
      await expect(faqSection.locator("h2")).toContainText(
        featuresCopy[locale].faq,
      );
      await faqItems.first().locator("summary").click();
      await expect(faqItems.first().locator("p")).toBeVisible();

      const finalHeading = page
        .locator("h2")
        .filter({ hasText: featuresCopy[locale].final });
      await expect(finalHeading).toHaveCount(1);
      await expect(finalHeading).toContainText(featuresCopy[locale].final);
      const finalSection = finalHeading.locator("xpath=ancestor::section[1]");
      await expect(finalSection.locator('a[href="/get-started"]')).toBeVisible();

      const heroBox = await hero.boundingBox();
      const previewBox = await heroPreview.boundingBox();
      expect(heroBox).not.toBeNull();
      expect(previewBox).not.toBeNull();
      const viewport = page.viewportSize();
      expect(viewport).not.toBeNull();

      if (viewport!.width >= 1024) {
        expect(Math.abs(heroBox!.y - previewBox!.y)).toBeLessThan(220);
        if (locale === "ar") {
          expect(heroBox!.x).toBeGreaterThan(previewBox!.x);
        } else {
          expect(heroBox!.x).toBeLessThan(previewBox!.x);
        }
      } else {
        expect(previewBox!.y).toBeGreaterThan(heroBox!.y);
      }

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
          .outputPath(`faq-features-${locale}-${theme}-${project}.png`),
        fullPage: true,
      });

      expect(errors).toEqual([]);
    });
  }
}

const pricingCopy = {
  en: {
    title: "Simple plans. Clear pricing.",
    plans: ["Starter", "Growth", "Scale"],
    prices: ["899", "1,599", "2,799"],
    included: "Everything you need to run a connected loyalty experience.",
    faq: "Pricing questions",
    final: "Find the right plan for your business.",
    proofTrial: "14 days free",
    proofPayment: "No payment required",
    popular: "MOST POPULAR",
    cta: "Start your free trial",
  },
  ar: {
    title: "باقات واضحة تناسب مرحلة نمو نشاطك.",
    plans: ["الأساسية", "الاحترافية", "المتقدمة"],
    prices: ["899", "1,599", "2,799"],
    included: "كل ما تحتاجه لإدارة تجربة ولاء مترابطة.",
    faq: "أسئلة شائعة عن الأسعار",
    final: "اختر الباقة المناسبة لنشاطك.",
    proofTrial: "14 يومًا مجانًا",
    proofPayment: "بدون دفع",
    popular: "الأكثر اختيارًا",
    cta: "ابدأ تجربتك المجانية",
  },
} as const;

for (const locale of ["en", "ar"] as const) {
  for (const theme of ["light", "dark"] as const) {
    test(`Pricing ${locale} ${theme}: plans, truth and responsive composition @desktop @mobile`, async ({
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

      const response = await page.goto("/pricing");
      expect(response?.status()).toBe(200);
      await expect(page.locator("main")).toHaveAttribute(
        "dir",
        locale === "ar" ? "rtl" : "ltr",
      );
      await expect(page.locator("html")).toHaveAttribute(
        "data-marketing-theme",
        theme,
      );

      const hero = page.getByRole("heading", {
        level: 1,
        name: pricingCopy[locale].title,
      });
      await expect(hero).toBeVisible();
      await expect(page.getByText(pricingCopy[locale].proofTrial, { exact: true })).toBeVisible();
      await expect(page.getByText(pricingCopy[locale].proofPayment, { exact: true })).toBeVisible();

      const planCards = page.locator("article").filter({
        has: page.locator('a[href="/get-started"]'),
      });
      await expect(planCards).toHaveCount(3);

      for (let index = 0; index < pricingCopy[locale].plans.length; index += 1) {
        const plan = pricingCopy[locale].plans[index];
        const card = planCards.filter({ hasText: plan }).first();
        await expect(card).toBeVisible();
        await expect(card.locator("h2")).toContainText(plan);
        await expect(card).toContainText(pricingCopy[locale].prices[index]);
        await expect(card.locator('a[href="/get-started"]')).toHaveText(
          pricingCopy[locale].cta,
        );
      }

      await expect(
        page.getByText(pricingCopy[locale].popular, { exact: true }),
      ).toBeVisible();
      await expect(
        page.locator("h2").filter({ hasText: pricingCopy[locale].included }).first(),
      ).toBeVisible();

      const faqHeading = page
        .locator("h2")
        .filter({ hasText: pricingCopy[locale].faq })
        .first();
      await expect(faqHeading).toBeVisible();
      const faqSection = faqHeading.locator("xpath=ancestor::section[1]");
      const faqItems = faqSection.locator("details");
      await expect(faqItems).toHaveCount(4);
      await expect(faqItems.first()).toHaveAttribute("open", "");
      await faqItems.nth(1).locator("summary").click();
      await expect(faqItems.nth(1).locator("p")).toBeVisible();

      const finalHeading = page
        .locator("h2")
        .filter({ hasText: pricingCopy[locale].final })
        .first();
      await expect(finalHeading).toBeVisible();
      const finalSection = finalHeading.locator("xpath=ancestor::section[1]");
      await expect(finalSection.locator('a[href="/get-started"]')).toBeVisible();

      const boxes = await planCards.evaluateAll((cards) =>
        cards.map((card) => {
          const rect = card.getBoundingClientRect();
          return { x: rect.x, y: rect.y, width: rect.width };
        }),
      );
      expect(boxes).toHaveLength(3);
      const viewport = page.viewportSize();
      expect(viewport).not.toBeNull();
      if (viewport!.width >= 1024) {
        expect(Math.max(...boxes.map((box) => box.y)) - Math.min(...boxes.map((box) => box.y))).toBeLessThan(80);
        expect(new Set(boxes.map((box) => Math.round(box.width))).size).toBeLessThanOrEqual(2);
      } else {
        expect(boxes[1].y).toBeGreaterThan(boxes[0].y);
        expect(boxes[2].y).toBeGreaterThan(boxes[1].y);
      }

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
          .outputPath(`faq-pricing-${locale}-${theme}-${project}.png`),
        fullPage: true,
      });

      expect(errors).toEqual([]);
    });
  }
}

const aboutCopy = {
  en: {
    title:
      "We’re building a clearer way for businesses to grow lasting customer relationships.",
    who:
      "Tanee brings customer loyalty and everyday business operations closer together.",
    why:
      "Loyalty should feel like a relationship, not another system to manage.",
    contact: "Let’s talk about the loyalty experience you want to build.",
    final:
      "Turn every eligible interaction into part of a stronger relationship.",
    availability: "Built for growing businesses",
  },
  ar: {
    title: "نبني طريقة أوضح تساعد الأنشطة على بناء علاقات تدوم مع عملائها.",
    who:
      "تجمع Tanee بين ولاء العملاء وعمليات النشاط اليومية في تجربة واحدة مترابطة.",
    why: "يجب أن يبدو الولاء كعلاقة، لا كنظام إضافي يحتاج إلى إدارة.",
    contact: "دعنا نتحدث عن تجربة الولاء التي تريد بناءها.",
    final: "اجعل كل تفاعل مؤهل جزءًا من علاقة أقوى مع العميل.",
    availability: "مصممة للأنشطة النامية",
  },
} as const;

for (const locale of ["en", "ar"] as const) {
  for (const theme of ["light", "dark"] as const) {
    test(`About ${locale} ${theme}: story, principles and responsive contact composition @desktop @mobile`, async ({
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

      const response = await page.goto("/about");
      expect(response?.status()).toBe(200);
      await expect(page.locator("main")).toHaveAttribute(
        "dir",
        locale === "ar" ? "rtl" : "ltr",
      );
      await expect(page.locator("html")).toHaveAttribute(
        "data-marketing-theme",
        theme,
      );

      const hero = page.locator("h1").filter({ hasText: aboutCopy[locale].title });
      await expect(hero).toHaveCount(1);
      await expect(hero).toBeVisible();

      const heroSection = hero.locator("xpath=ancestor::section[1]");
      await expect(heroSection.locator('a[href="/how-it-works"]')).toBeVisible();
      await expect(heroSection.locator('a[href="/contact"]')).toBeVisible();

      const whoHeading = page
        .locator("h2")
        .filter({ hasText: aboutCopy[locale].who })
        .first();
      const whyHeading = page
        .locator("h2")
        .filter({ hasText: aboutCopy[locale].why })
        .first();
      await expect(whoHeading).toBeVisible();
      await expect(whyHeading).toBeVisible();
      await expect(
        page.getByText(aboutCopy[locale].availability, { exact: true }),
      ).toBeVisible();

      const principles = page.locator("article");
      await expect(principles).toHaveCount(3);
      for (const card of await principles.all()) {
        await expect(card).toBeVisible();
      }

      const contactHeading = page.locator("#about-contact-title");
      await expect(contactHeading).toContainText(aboutCopy[locale].contact);
      const contactSection = contactHeading.locator("xpath=ancestor::section[1]");
      const supportLinks = contactSection.locator(
        'a[href^="mailto:"], a[href^="tel:"], a[href^="https://wa.me/"]',
      );
      expect(await supportLinks.count()).toBeGreaterThanOrEqual(1);
      for (const link of await supportLinks.all()) {
        await expect(link).toBeVisible();
      }

      const finalHeading = page
        .locator("h2")
        .filter({ hasText: aboutCopy[locale].final })
        .first();
      await expect(finalHeading).toBeVisible();
      const finalSection = finalHeading.locator("xpath=ancestor::section[1]");
      await expect(finalSection.locator('a[href="/get-started"]')).toBeVisible();

      const boxes = await principles.evaluateAll((cards) =>
        cards.map((card) => {
          const rect = card.getBoundingClientRect();
          return { x: rect.x, y: rect.y, width: rect.width };
        }),
      );
      expect(boxes).toHaveLength(3);
      const viewport = page.viewportSize();
      expect(viewport).not.toBeNull();
      if (viewport!.width >= 768) {
        expect(Math.max(...boxes.map((box) => box.y)) - Math.min(...boxes.map((box) => box.y))).toBeLessThan(80);
      } else {
        expect(boxes[1].y).toBeGreaterThan(boxes[0].y);
        expect(boxes[2].y).toBeGreaterThan(boxes[1].y);
      }

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
          .outputPath(`faq-about-${locale}-${theme}-${project}.png`),
        fullPage: true,
      });

      expect(errors).toEqual([]);
    });
  }
}

const contactCopy = {
  en: {
    title: "The right conversation can save you a lot of setup time.",
    meeting: "Book a meeting",
    whatsapp: "Chat on WhatsApp",
    direct: "Call or email",
    booking: "Tell us how you would like to meet.",
    directTitle: "Prefer to speak right away?",
    existing: "Already using Tanee?",
    signIn: "Sign in to Tanee",
  },
  ar: {
    title: "مكالمة صح ممكن توفّر عليك وقت كبير في تجهيز نشاطك.",
    meeting: "احجز اجتماع",
    whatsapp: "كلّمنا على WhatsApp",
    direct: "اتصل أو ابعت إيميل",
    booking: "قول لنا تحب نتقابل إزاي.",
    directTitle: "تفضّل تتكلم دلوقتي؟",
    existing: "بتستخدم Tanee بالفعل؟",
    signIn: "سجّل الدخول إلى Tanee",
  },
} as const;

for (const locale of ["en", "ar"] as const) {
  for (const theme of ["light", "dark"] as const) {
    test(`Contact ${locale} ${theme}: booking, support and responsive composition @desktop @mobile`, async ({
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

      const hero = page.locator("h1").filter({ hasText: contactCopy[locale].title });
      await expect(hero).toHaveCount(1);
      await expect(hero).toBeVisible();

      const routeCards = page.locator("#contact-options > div > a");
      await expect(routeCards).toHaveCount(3);
      await expect(routeCards.nth(0).locator("h2")).toContainText(
        contactCopy[locale].meeting,
      );
      await expect(routeCards.nth(1).locator("h2")).toContainText(
        contactCopy[locale].whatsapp,
      );
      await expect(routeCards.nth(2).locator("h2")).toContainText(
        contactCopy[locale].direct,
      );
      await expect(routeCards.nth(0)).toHaveAttribute("href", "#book-meeting");

      const booking = page.locator("#book-meeting");
      await expect(booking).toBeVisible();
      await expect(
        booking.locator("h2").filter({ hasText: contactCopy[locale].booking }),
      ).toBeVisible();

      const form = booking.locator("form");
      await expect(form).toBeVisible();
      for (const name of [
        "name",
        "business",
        "email",
        "phone",
        "country",
        "purpose",
        "preferredDate",
        "preferredTime",
        "meetingMethod",
        "notes",
      ]) {
        await expect(form.locator(`[name="${name}"]`)).toHaveCount(1);
      }

      const meetingDate = form.locator('[data-testid="meeting-date"]');
      const meetingTime = form.locator('[data-testid="meeting-time"]');
      await expect(meetingDate).toHaveAttribute("min", /\d{4}-\d{2}-\d{2}/);
      await expect(meetingDate).toHaveValue(/\d{4}-\d{2}-\d{2}/);
      await expect(meetingTime.locator("option")).toHaveCount(11);
      await expect(form.locator('select[name="meetingMethod"] option')).toHaveCount(6);
      await expect(form.locator('button[type="submit"]')).toBeVisible();

      const directHeading = page
        .locator("h2")
        .filter({ hasText: contactCopy[locale].directTitle })
        .first();
      await expect(directHeading).toBeVisible();
      const directSection = directHeading.locator("xpath=ancestor::section[1]");
      const supportLinks = directSection.locator(
        'a[href^="mailto:"], a[href^="tel:"], a[href^="https://wa.me/"]',
      );
      expect(await supportLinks.count()).toBeGreaterThanOrEqual(1);
      for (const link of await supportLinks.all()) {
        await expect(link).toBeVisible();
      }

      const existingHeading = page
        .locator("h2")
        .filter({ hasText: contactCopy[locale].existing })
        .first();
      await expect(existingHeading).toBeVisible();
      const existingAside = existingHeading.locator("xpath=ancestor::aside[1]");
      await expect(existingAside.locator('a[href="/login"]')).toContainText(
        contactCopy[locale].signIn,
      );

      const boxes = await routeCards.evaluateAll((cards) =>
        cards.map((card) => {
          const rect = card.getBoundingClientRect();
          return { x: rect.x, y: rect.y, width: rect.width };
        }),
      );
      expect(boxes).toHaveLength(3);
      const viewport = page.viewportSize();
      expect(viewport).not.toBeNull();
      if (viewport!.width >= 768) {
        expect(Math.max(...boxes.map((box) => box.y)) - Math.min(...boxes.map((box) => box.y))).toBeLessThan(80);
      } else {
        expect(boxes[1].y).toBeGreaterThan(boxes[0].y);
        expect(boxes[2].y).toBeGreaterThan(boxes[1].y);
      }

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
          .outputPath(`faq-contact-${locale}-${theme}-${project}.png`),
        fullPage: true,
      });

      expect(errors).toEqual([]);
    });
  }
}

async function expectContactSameRow(locator: Locator) {
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
      const viewport = page.viewportSize();
      expect(viewport).not.toBeNull();
      if (viewport!.width >= 480) {
        await expectContactSameRow(contactOptions);
      } else {
        const optionTops = await contactOptions.evaluateAll((nodes) =>
          nodes.map((node) => Math.round(node.getBoundingClientRect().top)),
        );
        expect(optionTops[1]).toBeGreaterThan(optionTops[0]);
        expect(optionTops[2]).toBeGreaterThan(optionTops[1]);
      }

      const bookingSection = page.locator("#book-meeting");
      await expect(bookingSection).toBeVisible();
      await expect(bookingSection).toHaveAttribute("tabindex", "-1");
      const meetingMethod = page.locator('select[name="meetingMethod"]');
      await expect(meetingMethod).toBeVisible();
      await expect(meetingMethod.locator("option")).toHaveCount(6);
      await expect(meetingMethod.locator('option[value="google-meet"]')).toHaveCount(1);
      await expect(meetingMethod.locator('option[value="zoom"]')).toHaveCount(1);
      await expect(meetingMethod.locator('option[value="phone"]')).toHaveCount(1);

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
      await expectContactSameRow(quickActions);
      await expect(panel.locator('a[href="/contact#book-meeting"]')).toBeVisible();
      await expect(panel.locator('a[href="/contact#whatsapp"]')).toBeVisible();
      await expect(
        panel.locator('a[href="/contact#contact-options"]'),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(panel).toBeHidden();

      if ((page.viewportSize()?.width ?? 1440) < 1440) {
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
        path: test
          .info()
          .outputPath(
            `faq-contact-${locale}-${theme}-${test.info().project.name.startsWith("mobile") ? "mobile" : "desktop"}.png`,
          ),
        fullPage: true,
      });
      expect(errors).toEqual([]);
    });
  }
}
