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
