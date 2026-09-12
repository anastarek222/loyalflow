import { defineConfig } from "@playwright/test";

const baseURL = process.env.STAGING_UAT_BASE_URL?.trim().replace(/\/$/, "");
if (!baseURL?.startsWith("https://")) {
  throw new Error("STAGING_UAT_BASE_URL must use HTTPS.");
}

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 90_000,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 30_000,
  },
  projects: [
    {
      name: "whatsapp-desktop",
      grep: /@desktop/,
      use: { browserName: "chromium", viewport: { width: 1440, height: 900 } },
    },
    {
      name: "whatsapp-mobile",
      grep: /@mobile/,
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
