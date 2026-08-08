#!/usr/bin/env tsx

import process from "node:process";

import { assertDatabaseScriptEnvironment } from "@/lib/server/database-script-guard";

function main() {
  const args = process.argv.slice(2);

  if (args.length !== 1 || args[0] !== "--preflight") {
    throw new Error(
      "This script supports --preflight only and never executes backup or restore commands.",
    );
  }

  const identity = assertDatabaseScriptEnvironment(
    "backup-restore-documentation",
    process.env,
  );
  const url = new URL(process.env.DATABASE_URL!);
  const databaseName = url.pathname.replace(/^\/+/, "");

  console.log("PASS: P2 backup/restore safety preflight completed.");
  console.log(`environment: ${identity.environment}`);
  console.log(`host: ${url.hostname}`);
  console.log(`database: ${databaseName}`);
  console.log("No backup or restore command was executed.");
}

try {
  main();
} catch (error) {
  console.error(
    `FAIL: ${error instanceof Error ? error.message : "Unknown preflight error."}`,
  );
  process.exitCode = 1;
}
