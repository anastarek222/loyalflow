import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

type Check = {
  name: string;
  ok: boolean;
  detail: string;
};

const root = process.cwd();

function runGit(args: string[]) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function safeCheck(name: string, fn: () => Check): Check {
  try {
    return fn();
  } catch {
    return {
      name,
      ok: false,
      detail: "check failed",
    };
  }
}

function migrationDirectories() {
  const directory = path.join(root, "prisma", "migrations");
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function main() {
  const checks: Check[] = [];

  checks.push(
    safeCheck("clean working tree", () => {
      const status = runGit(["status", "--porcelain"]);
      return {
        name: "clean working tree",
        ok: status.length === 0,
        detail: status.length === 0 ? "clean" : "uncommitted changes exist",
      };
    }),
  );

  checks.push(
    safeCheck("release commit", () => {
      const sha = runGit(["rev-parse", "HEAD"]);
      return {
        name: "release commit",
        ok: /^[a-f0-9]{40}$/i.test(sha),
        detail: /^[a-f0-9]{40}$/i.test(sha) ? sha.slice(0, 12) : "invalid Git SHA",
      };
    }),
  );

  checks.push(
    safeCheck("tracked environment files", () => {
      const tracked = runGit([
        "ls-files",
        ".env",
        ".env.local",
        ".env.production",
      ])
        .split("\n")
        .filter(Boolean);

      return {
        name: "tracked environment files",
        ok: tracked.length === 0,
        detail:
          tracked.length === 0
            ? "no runtime environment file is tracked"
            : "a runtime environment file is tracked",
      };
    }),
  );

  checks.push(
    safeCheck("release template", () => ({
      name: "release template",
      ok: fs.existsSync(path.join(root, ".env.example")),
      detail: fs.existsSync(path.join(root, ".env.example"))
        ? ".env.example present"
        : ".env.example missing",
    })),
  );

  checks.push(
    safeCheck("migration history", () => {
      const migrations = migrationDirectories();
      const latest = migrations.at(-1) ?? "none";
      return {
        name: "migration history",
        ok:
          migrations.length === 34 &&
          latest === "20260726224500_add_subscription_plan_entitlements",
        detail: `${migrations.length} committed migrations; latest ${latest}`,
      };
    }),
  );

  checks.push(
    safeCheck("lockfile", () => ({
      name: "lockfile",
      ok: fs.existsSync(path.join(root, "pnpm-lock.yaml")),
      detail: fs.existsSync(path.join(root, "pnpm-lock.yaml"))
        ? "pnpm-lock.yaml present"
        : "pnpm-lock.yaml missing",
    })),
  );

  console.log("LoyalFlow release checkpoint");
  console.log("============================");

  for (const check of checks) {
    console.log(`${check.ok ? "PASS" : "FAIL"}  ${check.name}: ${check.detail}`);
  }

  const failed = checks.filter((check) => !check.ok);
  if (failed.length > 0) {
    console.error(`\nRelease checkpoint failed: ${failed.length} blocking check(s).`);
    process.exitCode = 1;
    return;
  }

  console.log("\nRelease checkpoint passed.");
}

main();
