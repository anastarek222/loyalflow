import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  cpSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const sourceScanner = new URL(
  "../scripts/scan-destructive-migrations.mjs",
  import.meta.url
);

function normalize(statement) {
  return statement
    .replace(/--[^\n\r]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function sha256(statement) {
  return createHash("sha256")
    .update(normalize(statement), "utf8")
    .digest("hex");
}

function writeBaseline(root, entries) {
  const baseline = {
    version: 1,
    algorithm: "sha256",
    description: "Test baseline",
    entryCount: entries.length,
    entries: entries.map((entry) => {
      const statement = normalize(entry.statement);

      return {
        path: entry.path,
        line: entry.line,
        operation: entry.operation,
        statement,
        sha256: sha256(statement),
      };
    }),
  };

  writeFileSync(
    join(
      root,
      "prisma",
      "migrations",
      "destructive-sql-baseline.json"
    ),
    `${JSON.stringify(baseline, null, 2)}\n`
  );
}

function createFixture() {
  const root = mkdtempSync(
    join(tmpdir(), "loyalflow-destructive-sql-")
  );

  const scriptsDirectory = join(root, "scripts");
  const migrationsDirectory = join(
    root,
    "prisma",
    "migrations"
  );

  mkdirSync(scriptsDirectory, { recursive: true });
  mkdirSync(migrationsDirectory, { recursive: true });

  cpSync(
    sourceScanner,
    join(scriptsDirectory, "scan-destructive-migrations.mjs")
  );

  const migrationName = "20260101000000_initial";
  const migrationPath =
    `prisma/migrations/${migrationName}/migration.sql`;
  const migrationDirectory = join(
    migrationsDirectory,
    migrationName
  );

  mkdirSync(migrationDirectory, { recursive: true });

  const statement =
    'UPDATE "Business" SET "plan" = \'BUSINESS\';';

  writeFileSync(
    join(migrationDirectory, "migration.sql"),
    `${statement}\n`
  );

  writeBaseline(root, [
    {
      path: migrationPath,
      line: 1,
      operation: "UPDATE_DATA",
      statement,
    },
  ]);

  return {
    root,
    migrationPath,
    migrationDirectory,
    statement,
    cleanup() {
      rmSync(root, {
        recursive: true,
        force: true,
      });
    },
  };
}

function readBaseline(root) {
  return JSON.parse(
    readFileSync(
      join(
        root,
        "prisma",
        "migrations",
        "destructive-sql-baseline.json"
      ),
      "utf8"
    )
  );
}

function overwriteBaseline(root, baseline) {
  writeFileSync(
    join(
      root,
      "prisma",
      "migrations",
      "destructive-sql-baseline.json"
    ),
    `${JSON.stringify(baseline, null, 2)}\n`
  );
}

function runScanner(root) {
  const result = spawnSync(
    process.execPath,
    [
      join(
        root,
        "scripts",
        "scan-destructive-migrations.mjs"
      ),
    ],
    {
      cwd: root,
      encoding: "utf8",
    }
  );

  return {
    status: result.status,
    output: `${result.stdout}${result.stderr}`,
  };
}

test("reviewed destructive SQL passes", () => {
  const fixture = createFixture();

  try {
    const result = runScanner(fixture.root);

    assert.equal(result.status, 0);
    assert.match(
      result.output,
      /1 migrations scanned, 1 reviewed statements, 0 unreviewed/
    );
  } finally {
    fixture.cleanup();
  }
});

test("new destructive SQL fails", () => {
  const fixture = createFixture();

  try {
    writeFileSync(
      join(
        fixture.root,
        "prisma",
        "migrations",
        "20260202000000_new_drop",
        "migration.sql"
      ),
      'DROP TABLE "Customer";\n',
      { flag: "wx" }
    );
  } catch {
    const directory = join(
      fixture.root,
      "prisma",
      "migrations",
      "20260202000000_new_drop"
    );

    mkdirSync(directory, { recursive: true });
    writeFileSync(
      join(directory, "migration.sql"),
      'DROP TABLE "Customer";\n'
    );
  }

  try {
    const result = runScanner(fixture.root);

    assert.notEqual(result.status, 0);
    assert.match(
      result.output,
      /Unreviewed destructive SQL/
    );
    assert.match(result.output, /DROP_TABLE/);
  } finally {
    fixture.cleanup();
  }
});

test("changed reviewed statement fails", () => {
  const fixture = createFixture();

  try {
    writeFileSync(
      join(
        fixture.migrationDirectory,
        "migration.sql"
      ),
      'UPDATE "Business" SET "plan" = \'FREE\';\n'
    );

    const result = runScanner(fixture.root);

    assert.notEqual(result.status, 0);
    assert.match(
      result.output,
      /Unreviewed destructive SQL/
    );
    assert.match(
      result.output,
      /Stale destructive SQL baseline entry/
    );
  } finally {
    fixture.cleanup();
  }
});

test("stale baseline entry fails", () => {
  const fixture = createFixture();

  try {
    writeFileSync(
      join(
        fixture.migrationDirectory,
        "migration.sql"
      ),
      'CREATE TABLE "Safe" ("id" TEXT);\n'
    );

    const result = runScanner(fixture.root);

    assert.notEqual(result.status, 0);
    assert.match(
      result.output,
      /Stale destructive SQL baseline entry/
    );
  } finally {
    fixture.cleanup();
  }
});

test("duplicate baseline entry fails", () => {
  const fixture = createFixture();

  try {
    const baseline = readBaseline(fixture.root);
    baseline.entries.push({
      ...baseline.entries[0],
    });
    baseline.entryCount = baseline.entries.length;
    overwriteBaseline(fixture.root, baseline);

    const result = runScanner(fixture.root);

    assert.notEqual(result.status, 0);
    assert.match(
      result.output,
      /Duplicate destructive SQL baseline entry/
    );
  } finally {
    fixture.cleanup();
  }
});

test("comments and string literals do not create matches", () => {
  const fixture = createFixture();

  try {
    writeFileSync(
      join(
        fixture.migrationDirectory,
        "migration.sql"
      ),
      [
        '-- DROP TABLE "Ignored";',
        'CREATE TABLE "Safe" (',
        '  "message" TEXT DEFAULT \'DELETE FROM users\'',
        ');',
        "",
      ].join("\n")
    );

    writeBaseline(fixture.root, []);

    const result = runScanner(fixture.root);

    assert.equal(result.status, 0);
    assert.match(
      result.output,
      /0 reviewed statements, 0 unreviewed/
    );
  } finally {
    fixture.cleanup();
  }
});

test("migration_lock.toml is ignored", () => {
  const fixture = createFixture();

  try {
    writeFileSync(
      join(
        fixture.root,
        "prisma",
        "migrations",
        "migration_lock.toml"
      ),
      'provider = "postgresql"\nDROP TABLE ignored;\n'
    );

    const result = runScanner(fixture.root);

    assert.equal(result.status, 0);
    assert.doesNotMatch(
      result.output,
      /migration_lock\.toml/
    );
  } finally {
    fixture.cleanup();
  }
});

test("multiline destructive SQL is detected", () => {
  const fixture = createFixture();

  try {
    const multiline = [
      'ALTER TABLE "Business"',
      '  DROP CONSTRAINT',
      '  "Business_ownerId_fkey";',
    ].join("\n");

    writeFileSync(
      join(
        fixture.migrationDirectory,
        "migration.sql"
      ),
      `${multiline}\n`
    );

    writeBaseline(fixture.root, [
      {
        path: fixture.migrationPath,
        line: 1,
        operation: "DROP_CONSTRAINT",
        statement: multiline,
      },
    ]);

    const result = runScanner(fixture.root);

    assert.equal(result.status, 0);
    assert.match(
      result.output,
      /1 reviewed statements, 0 unreviewed/
    );
  } finally {
    fixture.cleanup();
  }
});
