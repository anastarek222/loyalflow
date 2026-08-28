import { defineConfig } from "@playwright/test";

const port = Number(process.env.BROWSER_UAT_PORT ?? 3100);
const host = process.env.BROWSER_UAT_HOST ?? "127.0.0.1";
const localBaseURL = `http://${host}:${port}`;
const remoteBaseURL = process.env.STAGING_UAT_BASE_URL?.trim().replace(/\/$/, "");
const baseURL = remoteBaseURL ?? localBaseURL;
const remoteStaging = Boolean(remoteBaseURL);
const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim();
const vercelProtectionBypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
const browserProxy = (process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY ?? process.env.https_proxy ?? process.env.http_proxy)?.trim();
const useProductionServer = Boolean(process.env.CI);
const localServerCommand = useProductionServer
  ? `npm run start -- --hostname 127.0.0.1 --port ${port}`
  : `npm run dev -- --webpack --hostname 127.0.0.1 --port ${port}`;

if (remoteStaging && !baseURL.startsWith("https://")) {
  throw new Error("STAGING_UAT_BASE_URL must use HTTPS.");
}

if (remoteStaging && !vercelProtectionBypass) {
  throw new Error("VERCEL_AUTOMATION_BYPASS_SECRET is required for protected Remote Staging UAT.");
}

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
    launchOptions: chromiumExecutablePath ? { executablePath: chromiumExecutablePath } : undefined,
    proxy: browserProxy ? { server: browserProxy } : undefined,
    // The managed execution proxy re-signs TLS. This exception is scoped to
    // protected Remote Staging UAT and is never enabled for local/production use.
    ignoreHTTPSErrors: remoteStaging && Boolean(browserProxy),
    extraHTTPHeaders: vercelProtectionBypass
      ? {
          "x-vercel-protection-bypass": vercelProtectionBypass,
          "x-vercel-set-bypass-cookie": "true",
        }
      : undefined,
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
    {
      name: "owner-onboarding-chromium",
      grep: /@owner-onboarding/,
      use: { browserName: "chromium", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
    {
      name: "owner-onboarding-webkit",
      grep: /@owner-onboarding/,
      use: { browserName: "webkit", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
  ],
  webServer: remoteStaging ? undefined : {
    command: localServerCommand,
    url: `${localBaseURL}/api/health/live`,
    reuseExistingServer:
      process.env.BROWSER_UAT_REUSE_EXISTING_SERVER === "true",
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
