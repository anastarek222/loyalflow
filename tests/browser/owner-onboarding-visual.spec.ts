import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { expect, test } from "@playwright/test";

import { PrismaClient } from "@/generated/prisma/client";

import {
  cleanupBrowserUat,
  prepareBrowserUat,
  type BrowserUatFixture,
  uatEmail,
} from "./fixtures";

let fixture: BrowserUatFixture;
let manifestPath: string;

async function withDisposableFixtureDatabase(
  operation: (prisma: PrismaClient) => Promise<void>,
) {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for disposable browser UAT.");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  try {
    await operation(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

async function seedConsumedPendingOwnerInvitation(runId: string) {
  if (process.env.STAGING_UAT_MANIFEST_PATH?.trim()) return;

  const usedAt = new Date();
  const expiresAt = new Date(usedAt.getTime() + 24 * 60 * 60 * 1000);
  const email = uatEmail("pending-owner", runId);

  await withDisposableFixtureDatabase(async (prisma) => {
    await prisma.$executeRaw`
      INSERT INTO "OwnerInvitation" (
        "id", "firstName", "lastName", "email", "tokenHash", "expiresAt", "usedAt", "createdAt"
      ) VALUES (
        ${randomUUID()},
        ${"Visual UAT"},
        ${"Pending Owner"},
        ${email},
        ${`browser-visual-${randomUUID()}`},
        ${expiresAt},
        ${usedAt},
        CURRENT_TIMESTAMP
      )
    `;
  });
}

async function signInPendingOwner(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page
    .getByLabel("Email address")
    .fill(uatEmail("pending-owner", fixture.runId));
  await page.getByLabel("Password").fill(process.env.UAT_FIXTURE_PASSWORD!);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/onboarding$/, { timeout: 20_000 });
}

test.describe.serial("Owner onboarding visual alignment @onboarding-visual", () => {
  test.beforeAll(async ({ baseURL }) => {
    const prepared = await prepareBrowserUat(baseURL!);
    fixture = prepared.fixture;
    manifestPath = prepared.manifestPath;
    await seedConsumedPendingOwnerInvitation(fixture.runId);
  });

  test.afterAll(async () => {
    if (fixture && manifestPath) {
      await cleanupBrowserUat(fixture.runId, manifestPath);
    }
  });

  test("owner onboarding keeps AR/EN and light/dark parity at mobile and desktop", async ({
    page,
    context,
    baseURL,
  }) => {
    test.setTimeout(120_000);
    await signInPendingOwner(page);

    for (const viewport of [
      { width: 390, height: 844, name: "390" },
      { width: 1366, height: 768, name: "1366" },
    ] as const) {
      await page.setViewportSize(viewport);

      for (const locale of ["en", "ar"] as const) {
        await context.addCookies([
          { name: "loyalflow_locale", value: locale, url: baseURL! },
        ]);

        for (const theme of ["light", "dark"] as const) {
          await page.evaluate(
            (value) => localStorage.setItem("tanee-theme", value),
            theme,
          );
          await page.goto("/onboarding");

          const shell = page.getByTestId("owner-onboarding-shell");
          const form = page.locator("form[data-owner-step]");
          const mobileHeader = page.getByTestId("owner-mobile-step-header");
          const desktopRail = form.locator(":scope > div > aside");

          await expect(shell).toHaveAttribute(
            "dir",
            locale === "ar" ? "rtl" : "ltr",
          );
          await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
          if (theme === "dark") {
            await expect(page.locator("html")).toHaveClass(/\bdark\b/);
          } else {
            await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
          }

          await expect(form).toHaveAttribute("data-owner-step", "1");
          await expect(form).toHaveAttribute("data-owner-hydrated", "true");
          await expect(
            page.getByRole("button", {
              name:
                locale === "ar"
                  ? "التبديل إلى الوضع الفاتح"
                  : "Switch to light mode",
            }),
          ).toHaveCount(theme === "dark" ? 1 : 0);

          const semanticColors = await page.evaluate(() => {
            const root = getComputedStyle(document.documentElement);
            const formElement = document.querySelector<HTMLElement>(
              "form[data-owner-step]",
            );
            const shellElement = document.querySelector<HTMLElement>(
              '[data-testid="owner-onboarding-shell"]',
            );
            return {
              canvas: root.getPropertyValue("--lf-canvas").trim(),
              surface: root.getPropertyValue("--lf-surface").trim(),
              shell: shellElement ? getComputedStyle(shellElement).backgroundColor : "",
              form: formElement ? getComputedStyle(formElement).backgroundColor : "",
            };
          });
          expect(semanticColors.canvas).not.toBe("");
          expect(semanticColors.surface).not.toBe("");
          expect(semanticColors.shell).not.toBe("rgba(0, 0, 0, 0)");
          expect(semanticColors.form).not.toBe("rgba(0, 0, 0, 0)");

          if (viewport.width < 1024) {
            await expect(mobileHeader).toBeVisible();
            await expect(desktopRail).toBeHidden();
          } else {
            await expect(mobileHeader).toBeHidden();
            await expect(desktopRail).toBeVisible();
          }

          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= window.innerWidth,
            ),
          ).toBe(true);

          await page.screenshot({
            path: test.info().outputPath(
              `onboarding-${viewport.name}-${locale}-${theme}.png`,
            ),
            fullPage: true,
          });
        }
      }
    }
  });
});
