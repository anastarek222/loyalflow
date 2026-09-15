#!/usr/bin/env bash
set -uo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${VERCEL_SHARE_URL:?VERCEL_SHARE_URL is required}"
: "${STAGING_UAT_BASE_URL:?STAGING_UAT_BASE_URL is required}"

password="Uat-$(openssl rand -hex 18)-9Z!"
fixture_auth_secret="$(openssl rand -hex 32)"
echo "::add-mask::$password"
echo "::add-mask::$fixture_auth_secret"
export UAT_FIXTURE_PASSWORD="$password"
export AUTH_SECRET="$fixture_auth_secret"
echo "FIXTURE_ONLY_AUTH_SECRET=GENERATED"
echo "SUPER_ADMIN_TABLET_UAT=EXCLUDED_REQUIRES_MATCHING_PREVIEW_AUTH_SECRET"

SYSTEM_CHROME="$(command -v google-chrome || command -v google-chrome-stable || true)"
if [ -z "$SYSTEM_CHROME" ]; then
  echo "::error::System Google Chrome is unavailable"
  exit 1
fi
export SYSTEM_CHROME
"$SYSTEM_CHROME" --version

rm -rf /tmp/phase-h-chrome-profile
mkdir -p /tmp/phase-h-chrome-profile
"$SYSTEM_CHROME" \
  --headless=new \
  --no-sandbox \
  --disable-gpu \
  --remote-debugging-address=127.0.0.1 \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/phase-h-chrome-profile \
  "$VERCEL_SHARE_URL" \
  >/tmp/phase-h-chrome.out 2>/tmp/phase-h-chrome.err &
chrome_pid=$!

cleanup_chrome() {
  kill "$chrome_pid" 2>/dev/null || true
  pkill -f '/tmp/phase-h-chrome-profile' 2>/dev/null || true
}
trap cleanup_chrome EXIT

for attempt in $(seq 1 60); do
  if curl -fsS http://127.0.0.1:9222/json/version >/dev/null 2>&1; then break; fi
  sleep 1
done
curl -fsS http://127.0.0.1:9222/json/version >/dev/null

node --input-type=module <<'NODE'
import { chromium } from '@playwright/test';
const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
const context = browser.contexts()[0];
if (!context) throw new Error('No persistent Chrome context found');
const page = context.pages()[0] ?? await context.newPage();
for (let attempt = 0; attempt < 30; attempt++) {
  await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
  const body = await page.locator('body').innerText().catch(() => '');
  if (/Tanee|LoyalFlow|Start your free trial|Sign in|تاني/i.test(body)) break;
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
const body = await page.locator('body').innerText();
if (!/Tanee|LoyalFlow|Start your free trial|Sign in|تاني/i.test(body)) {
  throw new Error(`CDP Preview bootstrap did not render app; final host=${new URL(page.url()).hostname}`);
}
await context.storageState({ path: '/tmp/phase-h-vercel-state.json' });
console.log(`CDP_PREVIEW_AUTH=PASS host=${new URL(page.url()).hostname}`);
await browser.close();
NODE

cleanup_chrome
trap - EXIT

node --input-type=module <<'NODE'
import { chromium } from '@playwright/test';
const browser = await chromium.launch({ executablePath: process.env.SYSTEM_CHROME, args: ['--no-sandbox'] });
const context = await browser.newContext({ storageState: '/tmp/phase-h-vercel-state.json' });
const page = await context.newPage();
const response = await page.goto(`${process.env.STAGING_UAT_BASE_URL}/card/not-a-valid-public-token`, { waitUntil: 'domcontentloaded', timeout: 60000 });
if (!response || response.status() !== 404) throw new Error(`Invalid Public Card expected 404, got ${response?.status()}`);
const heading = (await page.locator('h1').first().innerText()).trim();
if (!/Card unavailable|البطاقة غير متاحة/.test(heading)) throw new Error(`Unexpected invalid-card heading: ${heading}`);
console.log('INVALID_PUBLIC_CARD_PREFLIGHT=PASS status=404');
await browser.close();
NODE

cat > phase-h.partial.config.ts <<'EOF'
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  timeout: 75_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.STAGING_UAT_BASE_URL!,
    browserName: 'chromium',
    launchOptions: { executablePath: process.env.SYSTEM_CHROME!, args: ['--no-sandbox'] },
    storageState: '/tmp/phase-h-vercel-state.json',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 30_000,
  },
  projects: [
    { name: 'desktop', grep: /@desktop/, use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', grep: /@mobile/, use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
});
EOF

overall=0
for target in desktop mobile; do
  manifest="/tmp/phase-h-${target}.json"
  prepare_log="/tmp/phase-h-${target}-prepare.log"
  cleanup_log="/tmp/phase-h-${target}-cleanup.log"
  if ! npm run prepare:final-uat -- --base-url="$STAGING_UAT_BASE_URL" --manifest="$manifest" >"$prepare_log" 2>&1; then
    echo "::error::${target} fixture preparation failed"
    cat "$prepare_log"
    overall=1
    continue
  fi
  run_id="$(jq -r .runId "$manifest")"
  STAGING_UAT_MANIFEST_PATH="$manifest" pnpm exec playwright test tests/browser/final-uat-u13.spec.ts --config=phase-h.partial.config.ts --project="$target"
  test_code=$?
  cleanup_code=0
  npm run cleanup:final-uat -- --cleanup="$run_id" >"$cleanup_log" 2>&1 || cleanup_code=$?
  if [ "$cleanup_code" -eq 0 ]; then
    echo "${target^^}_CLEANUP=PASS"
  else
    echo "::error::${target} cleanup failed"
    cat "$cleanup_log"
    overall=1
  fi
  if [ "$test_code" -ne 0 ]; then overall=1; fi
done

echo "SUPER_ADMIN_TABLET_UAT=BLOCKED_REQUIRES_MATCHING_PREVIEW_AUTH_SECRET"
exit "$overall"
