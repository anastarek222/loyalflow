import { defineConfig } from "@playwright/test";

const port = Number(process.env.BROWSER_UAT_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  timeout: 45_000,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 10_000,
  },
  projects: [
    {
      name: "desktop-chromium",
      grep: /@desktop/,
      use: { browserName: "chromium", viewport: { width: 1440, height: 900 } },
    },
    {
      name: "tablet-chromium",
      grep: /@tablet/,
      use: { browserName: "chromium", viewport: { width: 768, height: 1024 }, hasTouch: true },
    },
    {
      name: "mobile-chromium",
      grep: /@mobile/,
      use: { browserName: "chromium", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
  ],
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    url: `${baseURL}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      UAT_BASE_URL: baseURL,
      // Google Sheets is an optional production mirror. The documented empty
      // spreadsheet ID keeps it disabled for disposable browser UAT fixtures,
      // so a developer's invalid local integration cannot delay a core action.
      GOOGLE_SPREADSHEET_ID: "",
    },
  },
});
