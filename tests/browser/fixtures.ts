import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type BrowserUatFixture = {
  runId: string;
  businessA: string;
  businessB: string;
  activeCustomer: { id: string; publicToken: string; customerCode: string };
  vipCustomer: { id: string; publicToken: string };
  otherCustomer: { id: string; publicToken: string };
  staffBranchId: string;
  publicEnrollmentPhone: string;
};

export function uatEmail(role: "owner-a" | "manager-a" | "staff-a" | "viewer-a" | "superadmin", runId: string) {
  return `lf-uat-final-${role}-${runId}@example.test`;
}

export async function prepareBrowserUat(baseURL: string): Promise<{ fixture: BrowserUatFixture; manifestPath: string }> {
  if (!process.env.UAT_FIXTURE_PASSWORD || process.env.UAT_FIXTURE_PASSWORD.length < 10) {
    throw new Error("UAT_FIXTURE_PASSWORD is required for browser UAT; no fixtures were created.");
  }

  const manifestPath = join(tmpdir(), `loyalflow-browser-uat-${randomUUID()}.json`);
  try {
    await execFileAsync("npm", ["run", "prepare:final-uat", "--", `--base-url=${baseURL}`, `--manifest=${manifestPath}`], {
      cwd: process.cwd(),
      env: process.env,
      maxBuffer: 1024 * 1024,
    });
    return { fixture: JSON.parse(await readFile(manifestPath, "utf8")) as BrowserUatFixture, manifestPath };
  } catch (error) {
    await rm(manifestPath, { force: true });
    throw error;
  }
}

export async function cleanupBrowserUat(runId: string, manifestPath: string) {
  try {
    await execFileAsync("npm", ["run", "cleanup:final-uat", "--", `--cleanup=${runId}`], {
      cwd: process.cwd(), env: process.env, maxBuffer: 1024 * 1024,
    });
  } finally {
    await rm(manifestPath, { force: true });
  }
}
