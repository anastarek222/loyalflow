import { expect, test, type Page } from "@playwright/test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { deflateSync } from "node:zlib";

import {
  cleanupBrowserUat,
  prepareBrowserUat,
  type BrowserUatFixture,
  uatEmail,
} from "./fixtures";

const execFileAsync = promisify(execFile);
let fixture: BrowserUatFixture;
let manifestPath: string;
let customCardPublished = false;

async function login(
  page: Page,
  role: "owner-a" | "manager-a" | "staff-a" | "viewer-a" | "superadmin",
) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(uatEmail(role, fixture.runId));
  await page.getByLabel("Password").fill(process.env.UAT_FIXTURE_PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).press("Enter");
  await expect(page).toHaveURL(
    role === "superadmin"
      ? /\/dashboard$/
      : new RegExp(`/businesses/${fixture.businessA}$`),
  );
}

async function expectSafePage(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    )
    .toBe(true);
  await expect(
    page.locator("#app-content").getByRole("heading", { level: 1 }),
  ).toHaveCount(1);
}

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer) {
  const typeBytes = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([length, typeBytes, data, checksum]);
}

function solidPng(width: number, height: number, rgb: [number, number, number]) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;

  const rowLength = width * 3 + 1;
  const raw = Buffer.alloc(rowLength * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * rowLength;
    raw[row] = 0;
    for (let x = 0; x < width; x += 1) {
      const pixel = row + 1 + x * 3;
      raw[pixel] = rgb[0];
      raw[pixel + 1] = rgb[1];
      raw[pixel + 2] = rgb[2];
    }
  }

  return Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

async function cleanupCustomCardArtwork(runId: string) {
  await execFileAsync(
    "pnpm",
    [
      "exec",
      "tsx",
      "scripts/cleanup-final-uat-card-artwork.ts",
      `--cleanup=${runId}`,
    ],
    {
      cwd: process.cwd(),
      env: process.env,
      maxBuffer: 1024 * 1024,
    },
  );
}

function canCleanUploadedBlobArtwork() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

test.describe.serial("Pre-final administration and security UAT", () => {
  test.beforeAll(async ({ baseURL }) => {
    const prepared = await prepareBrowserUat(baseURL!);
    fixture = prepared.fixture;
    manifestPath = prepared.manifestPath;
  });

  test.afterAll(async () => {
    if (!fixture || !manifestPath) return;
    if (customCardPublished) {
      await cleanupCustomCardArtwork(fixture.runId);
    }
    await cleanupBrowserUat(fixture.runId, manifestPath);
  });

  test.beforeEach(async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      const expectedVercelToolbarCspNoise =
        message.type() === "error" &&
        Boolean(process.env.STAGING_UAT_BASE_URL) &&
        message.text().includes("https://vercel.live/_next-live/feedback/feedback.js") &&
        message.text().includes("Content Security Policy");

      if (
        message.type() === "error" &&
        !message.text().includes("favicon.ico") &&
        !expectedVercelToolbarCspNoise
      ) {
        errors.push(message.text());
      }
    });
    (page as Page & { preFinalErrors?: string[] }).preFinalErrors = errors;
  });

  test.afterEach(async ({ page }) => {
    expect((page as Page & { preFinalErrors?: string[] }).preFinalErrors ?? []).toEqual([]);
  });

  test("owner administration surfaces, customer detail, notifications, and logout-everywhere @desktop", async ({ page }) => {
    test.setTimeout(120_000);
    await login(page, "owner-a");

    await page.goto(`/businesses/${fixture.businessA}/settings`);
    await expect(page.locator('[data-settings-administration="true"]')).toBeVisible();
    await expect(page.getByRole("link", { name: "Business profile", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Operations", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Card details", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Integrations", exact: true })).toBeVisible();
    await expectSafePage(page);

    await page.goto(`/businesses/${fixture.businessA}/program`);
    await expect(page.locator("[data-program-workspace]")).toBeVisible();
    await expect(page.getByRole("link", { name: "Earning rules", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Customer card", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Customer messages", exact: true })).toBeVisible();
    await expectSafePage(page);

    await page.goto(`/businesses/${fixture.businessA}/branches`);
    await expect(page.locator('[data-branches-administration="true"]')).toBeVisible();
    await expect(page.getByText("Branches & assignments", { exact: true })).toBeVisible();
    await expectSafePage(page);

    await page.goto(`/businesses/${fixture.businessA}/users`);
    await expect(page.getByText(uatEmail("manager-a", fixture.runId), { exact: true })).toBeVisible();
    await expect(page.getByText(uatEmail("staff-a", fixture.runId), { exact: true })).toBeVisible();
    await expectSafePage(page);

    await page.goto(`/businesses/${fixture.businessA}/customers/${fixture.activeCustomer.id}`);
    await expect(page.locator("[data-customer-profile-hero]")).toBeVisible();
    await expect(page.locator("[data-experience-customer-detail]")).toBeVisible();
    await expect(page.getByRole("link", { name: /card/i })).toHaveAttribute(
      "href",
      `/card/${fixture.activeCustomer.publicToken}`,
    );
    await expectSafePage(page);

    await page.goto(`/businesses/${fixture.businessA}?notifications=1`);
    const dialog = page.getByRole("dialog", { name: "Important notifications" });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    await page.goto(`/businesses/${fixture.businessA}?notifications=1`);
    await expect(dialog).toBeVisible();
    const markAll = dialog.getByRole("button", {
      name: "Mark all as read",
      exact: true,
    });
    if (await markAll.isEnabled()) {
      await markAll.click();
      await expect(
        dialog.getByRole("button", {
          name: "All notifications are read",
          exact: true,
        }),
      ).toBeDisabled();
    }

    await page.goto("/account/security");
    await page.once("dialog", (confirmation) => confirmation.accept());
    await Promise.all([
      page.waitForURL(/\/login$/),
      page.getByRole("button", { name: "Log out everywhere", exact: true }).click(),
    ]);
    await page.goto(`/businesses/${fixture.businessA}/settings`);
    await expect(page).toHaveURL(/\/login$/);
  });

  test("super admin Custom Card rejects invalid geometry and proves a bounded upload/publish lifecycle when cleanup credentials are available @desktop", async ({ page }) => {
    test.setTimeout(120_000);
    await login(page, "superadmin");
    await page.goto(`/businesses/${fixture.businessA}/program`);
    await expect(page.locator("[data-program-workspace]")).toBeVisible();

    const notConfigured = page.getByText(
      "Vercel Blob is not connected to this environment. Existing artwork remains unchanged and uploads fail closed.",
      { exact: true },
    );

    if (await notConfigured.count()) {
      await expect(notConfigured).toBeVisible();
      return;
    }

    const frontInput = page.getByLabel("Front artwork", { exact: true });
    const backInput = page.getByLabel("Back artwork", { exact: true });
    await expect(frontInput).toBeVisible();
    await expect(backInput).toBeVisible();

    await frontInput.setInputFiles({
      name: "invalid-front.png",
      mimeType: "image/png",
      buffer: solidPng(856, 540, [32, 55, 110]),
    });
    await backInput.setInputFiles({
      name: "invalid-back.png",
      mimeType: "image/png",
      buffer: solidPng(640, 480, [110, 55, 32]),
    });
    await Promise.all([
      page.waitForURL(/\/program\?cardDesign=invalid$/),
      page.getByRole("button", { name: "Create Front + Back draft", exact: true }).click(),
    ]);

    // A valid Blob write is attempted only when this runner can remove the
    // resulting immutable UAT objects before the database fixture is deleted.
    if (!canCleanUploadedBlobArtwork()) {
      test.info().annotations.push({
        type: "bounded-runtime",
        description:
          "Blob is configured on the application, but this UAT runner has no Blob cleanup credential; valid upload/publish is intentionally not mutated.",
      });
      return;
    }

    await page.getByLabel("Front artwork", { exact: true }).setInputFiles({
      name: "front.png",
      mimeType: "image/png",
      buffer: solidPng(856, 540, [25, 45, 90]),
    });
    await page.getByLabel("Back artwork", { exact: true }).setInputFiles({
      name: "back.png",
      mimeType: "image/png",
      buffer: solidPng(856, 540, [90, 45, 25]),
    });
    await Promise.all([
      page.waitForURL(/\/program\?cardDesign=draft&customVersion=[0-9a-f-]+$/),
      page.getByRole("button", { name: "Create Front + Back draft", exact: true }).click(),
    ]);

    const version = new URL(page.url()).searchParams.get("customVersion");
    expect(version).toMatch(/^[0-9a-f]{8}-[0-9a-f-]{27}$/i);
    await expect(page.getByText("Draft preview", { exact: true })).toBeVisible();
    for (const side of ["front", "back"] as const) {
      const image = page.getByAltText(`Custom card ${side} draft`, { exact: true });
      await expect(image).toBeVisible();
      await expect
        .poll(() => image.evaluate((node) => (node as HTMLImageElement).naturalWidth))
        .toBeGreaterThan(0);
    }

    await Promise.all([
      page.waitForURL(/\/program\?cardDesign=published$/),
      page.getByRole("button", { name: "Publish this Front + Back pair", exact: true }).click(),
    ]);
    customCardPublished = true;

    await page.goto(`/card/${fixture.activeCustomer.publicToken}`);
    await expect(page.getByTestId("custom-card-front")).toBeVisible();
    await expect(page.getByTestId("custom-card-back")).toBeAttached();
  });

  test("public card keeps the canonical front/back flip surface @mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/card/${fixture.activeCustomer.publicToken}`);
    const card = page.getByTestId("loyalty-card-flip");
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute("data-card-side", "front");
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(card).toHaveAttribute("data-card-side", "back");
    await page.getByRole("button", { name: "Flip card", exact: true }).click();
    await expect(card).toHaveAttribute("data-card-side", "front");

    if (customCardPublished) {
      await expect(page.getByTestId("custom-card-front")).toBeVisible();
      await expect(page.getByTestId("custom-card-back")).toBeAttached();
    }

    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth + 1,
        ),
      )
      .toBe(true);
  });
});
