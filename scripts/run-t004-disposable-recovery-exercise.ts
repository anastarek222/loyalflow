#!/usr/bin/env tsx

import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const HOST = "127.0.0.1";
const PORT = "5432";
const suffix = randomBytes(5).toString("hex");
const sourceDb = `loyalflow_t004_${suffix}_source_test`;
const restoreDb = `loyalflow_t004_${suffix}_restore_test`;
const backupPath = join(tmpdir(), `${sourceDb}.dump`);

let sourceCreated = false;
let restoreCreated = false;

function fail(message: string): never {
  throw new Error(message);
}

function run(command: string, args: string[], options?: { capture?: boolean }) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    env: {
      ...process.env,
      PGHOST: HOST,
      PGPORT: PORT,
    },
    stdio: options?.capture ? ["ignore", "pipe", "pipe"] : ["ignore", "pipe", "pipe"],
  });

  if (result.error) {
    fail(`${command} is unavailable: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const stderr = (result.stderr ?? "").trim();
    fail(`${command} failed${stderr ? `: ${stderr}` : ""}`);
  }

  return (result.stdout ?? "").trim();
}

function databaseExists(name: string) {
  const output = run(
    "psql",
    [
      "-h",
      HOST,
      "-p",
      PORT,
      "-d",
      "postgres",
      "-Atqc",
      `SELECT 1 FROM pg_database WHERE datname = '${name}'`,
    ],
    { capture: true },
  );
  return output === "1";
}

function cleanup() {
  for (const [name, created] of [
    [restoreDb, restoreCreated],
    [sourceDb, sourceCreated],
  ] as const) {
    if (!created) continue;
    const result = spawnSync(
      "dropdb",
      ["-h", HOST, "-p", PORT, "--if-exists", name],
      { encoding: "utf8", env: { ...process.env, PGHOST: HOST, PGPORT: PORT } },
    );
    if (result.status !== 0) {
      console.error(`WARN: cleanup could not drop ${name}. Remove this disposable *_test database manually.`);
    }
  }

  if (existsSync(backupPath)) {
    rmSync(backupPath, { force: true });
  }
}

function main() {
  if (process.argv.length !== 3 || process.argv[2] !== "--execute") {
    fail("Refused. Run with exactly --execute after explicit approval for the disposable local exercise.");
  }
  if (process.env.LOYALFLOW_ALLOW_DISPOSABLE_DB !== "1") {
    fail("Refused. LOYALFLOW_ALLOW_DISPOSABLE_DB=1 is required.");
  }
  if (process.env.PGHOST && process.env.PGHOST !== HOST && process.env.PGHOST !== "localhost") {
    fail("Refused. PGHOST must be unset, localhost, or 127.0.0.1.");
  }

  for (const tool of ["psql", "createdb", "dropdb", "pg_dump", "pg_restore"]) {
    run(tool, ["--version"], { capture: true });
  }

  if (databaseExists(sourceDb) || databaseExists(restoreDb)) {
    fail("Refused because a generated disposable database name already exists.");
  }

  run("createdb", ["-h", HOST, "-p", PORT, sourceDb]);
  sourceCreated = true;

  run("psql", [
    "-h",
    HOST,
    "-p",
    PORT,
    "-d",
    sourceDb,
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    "CREATE TABLE t004_recovery_probe (id integer PRIMARY KEY, marker text NOT NULL); INSERT INTO t004_recovery_probe VALUES (1, 'alpha'), (2, 'beta'), (3, 'gamma');",
  ]);

  const sourceRows = Number(
    run("psql", ["-h", HOST, "-p", PORT, "-d", sourceDb, "-Atqc", "SELECT count(*) FROM t004_recovery_probe"], { capture: true }),
  );
  if (sourceRows !== 3) fail("Synthetic source validation failed before backup.");

  const backupStartedAt = new Date();
  const backupStartMs = Date.now();
  run("pg_dump", ["-h", HOST, "-p", PORT, "-Fc", "-f", backupPath, sourceDb]);
  const backupCompletedAt = new Date();
  const backupDurationMs = Date.now() - backupStartMs;

  if (!existsSync(backupPath) || statSync(backupPath).size <= 0) {
    fail("Backup artifact was not created or is empty.");
  }

  const checksum = createHash("sha256").update(readFileSync(backupPath)).digest("hex");
  const artifactBytes = statSync(backupPath).size;

  run("createdb", ["-h", HOST, "-p", PORT, restoreDb]);
  restoreCreated = true;

  const restoreStartedAt = new Date();
  const restoreStartMs = Date.now();
  run("pg_restore", [
    "-h",
    HOST,
    "-p",
    PORT,
    "--no-owner",
    "--no-privileges",
    "--exit-on-error",
    "-d",
    restoreDb,
    backupPath,
  ]);
  const restoreCompletedAt = new Date();
  const restoreDurationMs = Date.now() - restoreStartMs;

  const restoredRows = Number(
    run("psql", ["-h", HOST, "-p", PORT, "-d", restoreDb, "-Atqc", "SELECT count(*) FROM t004_recovery_probe"], { capture: true }),
  );
  const restoredMarkers = run(
    "psql",
    ["-h", HOST, "-p", PORT, "-d", restoreDb, "-Atqc", "SELECT string_agg(marker, ',' ORDER BY id) FROM t004_recovery_probe"],
    { capture: true },
  );

  if (restoredRows !== 3 || restoredMarkers !== "alpha,beta,gamma") {
    fail("Restore validation failed: restored synthetic data does not match source data.");
  }

  console.log("PASS: T004 disposable local PostgreSQL backup/restore exercise completed.");
  console.log(`host: ${HOST}`);
  console.log(`port: ${PORT}`);
  console.log(`source_database: ${sourceDb}`);
  console.log(`restore_database: ${restoreDb}`);
  console.log(`backup_started_at: ${backupStartedAt.toISOString()}`);
  console.log(`backup_completed_at: ${backupCompletedAt.toISOString()}`);
  console.log(`backup_duration_ms: ${backupDurationMs}`);
  console.log(`backup_artifact_bytes: ${artifactBytes}`);
  console.log(`backup_sha256: ${checksum}`);
  console.log(`restore_started_at: ${restoreStartedAt.toISOString()}`);
  console.log(`restore_completed_at: ${restoreCompletedAt.toISOString()}`);
  console.log(`restore_duration_ms: ${restoreDurationMs}`);
  console.log(`validated_rows: ${restoredRows}`);
  console.log("validated_markers: alpha,beta,gamma");
  console.log("scope: synthetic disposable-local exercise only; this is not production RPO/RTO evidence.");
}

try {
  main();
} catch (error) {
  console.error(`FAIL: ${error instanceof Error ? error.message : "Unknown exercise error."}`);
  process.exitCode = 1;
} finally {
  cleanup();
}
