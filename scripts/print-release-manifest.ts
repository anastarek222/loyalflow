import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { getPublicReleaseMetadata } from "@/lib/server/release";

const root = process.cwd();

function git(args: string[]) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

const migrations = fs
  .readdirSync(path.join(root, "prisma", "migrations"), {
    withFileTypes: true,
  })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const metadata = getPublicReleaseMetadata();

console.log(
  JSON.stringify(
    {
      service: "loyalflow",
      gitSha: git(["rev-parse", "HEAD"]),
      gitShortSha: git(["rev-parse", "--short=12", "HEAD"]),
      branch: git(["rev-parse", "--abbrev-ref", "HEAD"]),
      environment: metadata.environment,
      release: metadata.release,
      migrationCount: migrations.length,
      latestMigration: migrations.at(-1) ?? null,
      generatedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);
