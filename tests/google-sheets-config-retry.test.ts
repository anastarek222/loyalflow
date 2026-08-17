import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const safeSyncPath = new URL("../lib/google-sheets-sync-safe.ts", import.meta.url);
const workerPath = new URL("../lib/server/integrations/worker.ts", import.meta.url);

test("missing Google Sheets configuration is non-retryable", async () => {
  const source = await readFile(safeSyncPath, "utf8");

  assert.match(
    source,
    /error instanceof GoogleSheetsConfigurationError\) return false/,
  );
});

test("integration worker derives retry scheduling from the sync result", async () => {
  const source = await readFile(workerPath, "utf8");

  assert.match(source, /retryable:\s*result\.retryable/);
});
