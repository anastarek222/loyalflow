import { expect, test, type Page } from "@playwright/test";

import {
  cleanupBrowserUat,
  prepareBrowserUat,
  type BrowserUatFixture,
  uatEmail,
} from "./fixtures";

let fixture: BrowserUatFixture;
let manifestPath: string;
const invalidPublicCardPath = "/card/not-a-valid-public-token";
const expectedInvalidPublicCard404 = "Failed to load resource: the server responded with a status of 404 (Not Found)";

function applicationNavigation(page: Page) {
  return page.getByRole("complementary", { name: "Primary navigation", exact: true });
}

async function openCustomerFromScanSearch(page: Page, language: "EN" | "AR") {
  const copy = language === "AR"
    ? {
        scannerStatus: "حالة ماسح QR",
        scannerInstruction: "وجّه الكاميرا ناحية QR الخاص بالعميل.",
        searchLabel: "البحث عن عميل",
        openCustomer: "فتح العميل",
      }
    : {
        scannerStatus: "QR scanner status",
        scannerInstruction: "Point the camera at the customer QR code.",
        searchLabel: "Find a customer",
        openCustomer: "Open customer",
      };

  // The trace confirms search is rendered with the scanner; there is no separate
  // camera-to-search fallback control to activate.
  await expect(page.getByRole("status", { name: copy.scannerStatus, exact: true })).toHaveText(copy.scannerInstruction);
  await page.getByRole("textbox", { name: copy.searchLabel, exact: true }).fill(fixture.activeCustomer.customerCode);

  const customerResult = page.getByRole("link", {
    name: `${copy.openCustomer}: Final UAT active`,
    exact: true,
  });
  await expect(customerResult).toHaveAttribute(
    "href",
    `/businesses/${fixture.businessA}/scan/customer/${fixture.activeCustomer.id}`,
  );
  await Promise.all([
    page.waitForURL(new RegExp(`/scan/customer/${fixture.activeCustomer.id}$`), { timeout: 15_000 }),
    customerResult.click(),
  ]);
}

function scanOperationTerminalUrl(customerId: string) {
  return new RegExp(`/scan/customer/${customerId}\\?(?:success=(?:earned|redeemed)|error=(?:invalid|permission|reward-unavailable|insufficient-balance|conflict|invalid-branch|invalid-staff|generic))$`);
}

function currentScanBalance(page: Page, language: "EN" | "AR", balance: number) {
  const label = language === "AR" ? "الرصيد الحالي" : "Current balance";
  return page.getByRole("region", { name: label, exact: true }).getByText(`${balance} Points`, { exact: true });
}

async function login(page: Page, role: "owner-a" | "manager-a" | "staff-a" | "viewer-a" | "superadmin") {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(uatEmail(role, fixture.runId));
  await page.getByLabel("Password").fill(process.env.UAT_FIXTURE_PASSWORD!);
  await page.getByRole("button", { name: "Sign in" }).press("Enter");
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function logout(page: Page) {
  await page.getByRole("button", { name: "Account menu", exact: true }).click();
  await Promise.all([
    page.waitForURL(/\/login$/),
    page.getByRole("menuitem", { name: "Log out", exact: true }).click(),
  ]);
  await expect(page.getByLabel("Email address")).toBeVisible();
}

async function assertViewportSafety(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

async function assertAuthenticatedViewportSafety(page: Page) {
  await assertViewportSafety(page);
  await expect(page.locator("#app-content").getByRole("heading", { level: 1 })).toHaveCount(1);
}

test.describe.serial("U13 final Chromium browser UAT", () => {
  test.beforeAll(async ({ baseURL }) => {
    const prepared = await prepareBrowserUat(baseURL!);
    fixture = prepared.fixture;
    manifestPath = prepared.manifestPath;
  });

  test.afterAll(async () => {
    if (fixture && manifestPath) await cleanupBrowserUat(fixture.runId, manifestPath);
  });

  test.beforeEach(async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      const isExpectedInvalidPublicCard404 =
        message.type() === "error" &&
        message.text() === expectedInvalidPublicCard404 &&
        message.location().url.endsWith(invalidPublicCardPath);

      if (
        message.type() === "error" &&
        !message.text().includes("favicon.ico") &&
        !isExpectedInvalidPublicCard404
      ) {
        errors.push(message.text());
      }
    });
    (page as Page & { uatErrors?: string[] }).uatErrors = errors;
  });

  test.afterEach(async ({ page }) => {
    expect((page as Page & { uatErrors?: string[] }).uatErrors ?? []).toEqual([]);
  });

  test("authentication, owner navigation, reports, and exact-once Scan earn/redeem @desktop", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/businesses/forbidden/scan");
    await expect(page).toHaveURL(/\/login$/);
    await page.getByLabel("Email address").fill("nobody@example.test");
    await page.getByLabel("Password").fill("invalid-password");
    await page.getByRole("button", { name: "Sign in" }).press("Enter");
    await expect(page.getByText("الإيميل أو كلمة المرور غير صحيحة.")).toBeVisible();

    await login(page, "owner-a");
    await expect(page.locator("[data-app-language='EN']")).toHaveAttribute("dir", "ltr");
    await assertAuthenticatedViewportSafety(page);
    await page.goto(`/businesses/${fixture.businessA}`);
    const navigation = applicationNavigation(page);
    await expect(navigation.getByRole("link", { name: "Home", exact: true })).toBeVisible();
    await expect(navigation.getByRole("link", { name: "Scan", exact: true })).toBeVisible();
    await expect(navigation.getByRole("link", { name: "Customers", exact: true })).toBeVisible();
    await expect(navigation.getByRole("link", { name: "Activity", exact: true })).toBeVisible();
    await expect(navigation.getByRole("link", { name: "Reports", exact: true })).toBeVisible();
    await expect(navigation.getByRole("button", { name: "Advanced tools", exact: true })).toBeVisible();
    await expect(navigation.getByRole("link", { name: "Rewards", exact: true })).toHaveCount(0);
    await expect(navigation.getByRole("link", { name: "Offers", exact: true })).toHaveCount(0);
    await expect(navigation.getByRole("link", { name: "Campaigns", exact: true })).toHaveCount(0);
    await expect(navigation.getByRole("link", { name: "Recovery", exact: true })).toHaveCount(0);

    // Simple mode reduces presentation only: the owner retains authorization for growth pages.
    await page.goto(`/businesses/${fixture.businessA}/rewards`);
    await expect(page.locator("#app-content").getByRole("heading", { level: 1 })).toHaveCount(1);
    await page.goto(`/businesses/${fixture.businessA}`);
    await page.getByRole("button", { name: "Account menu", exact: true }).click();
    const experienceMode = page.getByRole("group", { name: "Experience mode", exact: true });
    await expect(experienceMode.getByRole("button", { name: "Simple", exact: true })).toHaveAttribute("aria-pressed", "true");
    await experienceMode.getByRole("button", { name: "Advanced", exact: true }).click();
    await expect(navigation.getByRole("heading", { name: "Growth", exact: true })).toBeVisible();
    await expect(navigation.getByRole("heading", { name: "Analytics", exact: true })).toBeVisible();
    await expect(navigation.getByRole("heading", { name: "Administration", exact: true })).toBeVisible();
    await expect(navigation.getByRole("link", { name: "Rewards", exact: true })).toBeVisible();
    await expect(navigation.getByRole("link", { name: "Offers", exact: true })).toBeVisible();
    await expect(navigation.getByRole("link", { name: "Campaigns", exact: true })).toBeVisible();
    await expect(navigation.getByRole("link", { name: "Recovery", exact: true })).toBeVisible();
    await expect(navigation.getByRole("link", { name: "Reports", exact: true })).toBeVisible();
    await expect(navigation.getByRole("link", { name: "Team", exact: true })).toBeVisible();

    await navigation.getByRole("link", { name: "Rewards", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/businesses/${fixture.businessA}/rewards$`));
    await expect(page.locator("#app-content").getByRole("heading", { level: 1 })).toHaveCount(1);
    for (const path of ["offers", "campaigns", "recovery"]) {
      await page.goto(`/businesses/${fixture.businessA}/${path}`);
      await expect(page.locator("#app-content").getByRole("heading", { level: 1 })).toHaveCount(1);
    }

    await page.goto(`/businesses/${fixture.businessA}/reports?from=2026-07-20&to=2026-07-24`);
    await expect(page.locator("#app-content").getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.locator("text=/NaN|Infinity/")).toHaveCount(0);
    await assertAuthenticatedViewportSafety(page);

    await page.goto(`/businesses/${fixture.businessA}/scan`);
    await openCustomerFromScanSearch(page, "EN");
    await expect(currentScanBalance(page, "EN", 4)).toBeVisible();
    await page.getByLabel(/Branch/i).selectOption({ label: "Final UAT A Branch One" });
    await page.getByRole("button", { name: "+ Add visit", exact: true }).click();
    await expect(page).toHaveURL(scanOperationTerminalUrl(fixture.activeCustomer.id), { timeout: 15_000 });
    await expect(page).toHaveURL(new RegExp(`/scan/customer/${fixture.activeCustomer.id}\\?success=earned$`));
    await expect(page.getByRole("status")).toBeVisible();
    await expect(currentScanBalance(page, "EN", 5)).toBeVisible();
    await page.reload();
    await expect(currentScanBalance(page, "EN", 5)).toBeVisible();

    await page.goto(`/businesses/${fixture.businessA}/scan/customer/${fixture.vipCustomer.id}`);
    const activeReward = page.getByRole("region", { name: "Final UAT active reward", exact: true });
    await expect(activeReward).toHaveCount(1);
    const rewardBranch = activeReward.getByLabel("Branch", { exact: true });
    await rewardBranch.selectOption({ label: "Final UAT A Branch One" });
    await expect(rewardBranch).toHaveValue(fixture.staffBranchId);
    await activeReward.getByRole("button", { name: "Redeem reward", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/scan/customer/${fixture.vipCustomer.id}\\?success=redeemed$`), { timeout: 15_000 });
    await expect(page.getByRole("status")).toBeVisible();
    await expect(page.getByRole("link", { name: "📷 Scan next customer", exact: true })).toBeVisible();
  });

  test("manager and viewer remain within their authoritative capabilities @desktop", async ({ page }) => {
    await login(page, "manager-a");
    await page.goto(`/businesses/${fixture.businessA}/customers`);
    await expect(page.locator("#app-content").getByRole("heading", { level: 1 })).toHaveCount(1);
    await page.goto(`/businesses/${fixture.businessA}/users`);
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto(`/businesses/${fixture.businessB}/customers`);
    await expect(page).toHaveURL(/\/dashboard$/);

    await logout(page);
    await login(page, "viewer-a");
    await page.goto(`/businesses/${fixture.businessA}/reports`);
    await expect(page.locator("#app-content").getByRole("heading", { level: 1 })).toHaveCount(1);
    await page.goto(`/businesses/${fixture.businessA}/scan`);
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(applicationNavigation(page).getByRole("link", { name: "Team", exact: true })).toHaveCount(0);
  });

  test("super admin has explicit global and business context @tablet", async ({ page }) => {
    await login(page, "superadmin");
    await page.goto("/businesses");
    await expect(page.locator("#app-content").getByRole("heading", { level: 1 })).toHaveCount(1);
    const businessCard = page.locator(`a[href="/businesses/${fixture.businessA}"]`);
    await expect(businessCard).toHaveCount(1);
    await expect(businessCard).toContainText("LoyalFlow final UAT Business A VISITS");
    await businessCard.click();
    await expect(page.getByRole("banner").locator("[data-current-business-context='true']")).toBeVisible();
    await page.goto(`/businesses/${fixture.businessA}/users`);
    await expect(page.locator("#app-content").getByRole("heading", { level: 1 })).toHaveCount(1);
    await assertAuthenticatedViewportSafety(page);
  });

  test("staff operates Scan in Arabic on mobile with branch context and no reports access @mobile", async ({ page }) => {
    await login(page, "staff-a");
    await expect(page.locator("[data-app-language='AR']")).toHaveAttribute("dir", "rtl");
    await page.goto(`/businesses/${fixture.businessA}/scan`);
    await expect(page.locator("#app-content").getByRole("heading", { level: 1 })).toHaveCount(1);
    await openCustomerFromScanSearch(page, "AR");
    await expect(currentScanBalance(page, "AR", 4)).toBeVisible();
    const branch = page.getByLabel(/الفرع/);
    await branch.selectOption({ label: "Final UAT A Branch One" });
    await expect(branch).toHaveValue(fixture.staffBranchId);
    await page.getByRole("button", { name: "+ إضافة زيارة", exact: true }).click();
    await expect(page).toHaveURL(scanOperationTerminalUrl(fixture.activeCustomer.id), { timeout: 15_000 });
    await expect(page).toHaveURL(new RegExp(`/scan/customer/${fixture.activeCustomer.id}\\?success=earned$`));
    await expect(page.getByRole("status")).toBeVisible();
    await expect(currentScanBalance(page, "AR", 5)).toBeVisible();
    await page.reload();
    await expect(currentScanBalance(page, "AR", 5)).toBeVisible();
    await page.goto(`/businesses/${fixture.businessA}/reports`);
    await expect(page).toHaveURL(new RegExp(`/businesses/${fixture.businessA}$`));
    await assertAuthenticatedViewportSafety(page);
  });

  test("public enrollment and English/Arabic public cards are responsive and private @mobile", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "userAgent", {
        configurable: true,
        get: () => "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      });
    });
    await page.goto(`/join/${fixture.businessA}`);
    await expect(page.locator("main")).toHaveAttribute("dir", "ltr");
    await page.getByLabel("First name").fill("Browser UAT");
    await page.getByLabel("Phone number").fill(fixture.publicEnrollmentPhone);
    await page.getByRole("button", { name: "Create digital card", exact: true }).click();
    await expect(page).toHaveURL(/\/card\/[^/?#]+\?welcome=1$/);
    await expect(page.getByText(/Private final UAT fixture note/)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Share card", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Copy link", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add to Home Screen", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Add to Home Screen", exact: true }).click();
    const installHelp = page.getByRole("dialog", { name: "Add card to Home Screen", exact: true });
    await expect(installHelp).toBeVisible();
    await installHelp.getByRole("button", { name: "Close", exact: true }).click();
    await expect(installHelp).toHaveCount(0);
    await page.getByRole("button", { name: "↻ Flip card", exact: true }).click();
    await expect(page.getByRole("img", { name: "Scan to open this card", exact: true })).toBeVisible();

    await page.goto(`/card/${fixture.activeCustomer.publicToken}`);
    await expect(page.locator("main")).toHaveAttribute("dir", "ltr");
    await expect(page.getByText("Front side", { exact: true })).toBeVisible();
    await expect(page.getByText("Final UAT active", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "↻ Flip card", exact: true }).click();
    await expect(page.getByText("Back side", { exact: true })).toBeVisible();
    await expect(page.getByRole("img", { name: "Scan to open this card", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Copy link", exact: true })).toBeVisible();
    await expect(page.getByText(/Private final UAT fixture note/)).toHaveCount(0);
    await assertViewportSafety(page);

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(`/card/${fixture.otherCustomer.publicToken}`);
    await expect(page.locator("main")).toHaveAttribute("dir", "rtl");
    await page.getByRole("button", { name: "العربية", exact: true }).click();
    await expect(page.getByRole("button", { name: "العربية", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("الوجه الأمامي", { exact: true })).toBeVisible();
    await expect(page.getByText("يتقلب الكارت تلقائيًا", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "↻ اقلب الكارت", exact: true }).click();
    await expect(page.getByText("الوجه الخلفي", { exact: true })).toBeVisible();
    await expect(page.getByRole("img", { name: "امسح الكود لفتح الكارت", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "نسخ الرابط", exact: true })).toBeVisible();
    await assertViewportSafety(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const invalidCardResponse = await page.goto(invalidPublicCardPath);
    expect(invalidCardResponse).not.toBeNull();
    expect(invalidCardResponse?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Card unavailable", exact: true })).toBeVisible();
    await expect(page.getByText("This loyalty card is unavailable or the link is no longer valid.", { exact: true })).toBeVisible();
  });
});
