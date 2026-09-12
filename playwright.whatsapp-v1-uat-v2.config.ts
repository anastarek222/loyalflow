import { defineConfig } from "@playwright/test";

const baseURL = "http://127.0.0.1:3000";
const candidateSha = "a0ba58cbfcbf01378b80475de31344d560844243";
const runtimeEnv = [
  "NODE_ENV=production",
  "NEXT_PUBLIC_APP_URL=https://gettanee.com",
  "NEXT_PUBLIC_SITE_URL=https://gettanee.com",
  `AUTH_URL=${baseURL}`,
  "AUTH_TRUST_HOST=true",
  `LOYALFLOW_RELEASE_SHA=${candidateSha}`,
].join(" ");

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 90_000,
  reporter: [["list"], ["html", { open: "never" }]],
  webServer: {
    command: `${runtimeEnv} pnpm run build && ${runtimeEnv} pnpm start`,
    url: `${baseURL}/api/health/live`,
    reuseExistingServer: false,
    timeout: 240_000,
  },
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
