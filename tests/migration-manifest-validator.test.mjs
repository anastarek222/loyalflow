import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  cpSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const sourceValidator = new URL(
  "../scripts/validate-migration-manifest.mjs",
  import.meta.url
);

function sha256(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

function createFixture() {
  const root = mkdtempSync(join(tmpdir(), "loyalflow-migrations-"));
  const scriptsDirectory = join(root, "scripts");
  const migrationsDirectory = join(root, "prisma", "migrations");

  mkdirSync(scriptsDirectory, { recursive: true });
  mkdirSync(migrationsDirectory, { recursive: true });

  cpSync(
    sourceValidator,
    join(scriptsDirectory, "validate-migration-manifest.mjs")
  );

  const migrations = [
    {
      name: "20260101000000_initial",
      sql: "CREATE TABLE example_one (id TEXT PRIMARY KEY);\n",
    },
    {
      name: "20260202000000_add_example",
      sql: "ALTER TABLE example_one ADD COLUMN label TEXT;\n",
    },
  ];

  for (const migration of migrations) {
    const directory = join(migrationsDirectory, migration.name);
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, "migration.sql"), migration.sql);
  }

  writeManifest(root, migrations);

  return {
    root,
    migrations,
    migrationsDirectory,
    cleanup() {
      rmSync(root, { recursive: true, force: true });
    },
  };
}

function writeManifest(root, migrations) {
  const entries = migrations.map((migration, index) => ({
    order: index + 1,
    name: migration.name,
    path: `prisma/migrations/${migration.name}/migration.sql`,
    sha256: sha256(migration.sql),
  }));

  const manifest = {
    version: 1,
    algorithm: "sha256",
    migrationCount: entries.length,
    migrations: entries,
  };

  writeFileSync(
    join(root, "prisma", "migrations", "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
}

function readManifest(root) {
  return JSON.parse(
    readFileSync(
      join(root, "prisma", "migrations", "manifest.json"),
      "utf8"
    )
  );
}

function overwriteManifest(root, manifest) {
  writeFileSync(
    join(root, "prisma", "migrations", "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
}

function runValidator(root) {
  const result = spawnSync(
    process.execPath,
    [join(root, "scripts", "validate-migration-manifest.mjs")],
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

test("valid migration repository passes", () => {
  const fixture = createFixture();

  try {
    const result = runValidator(fixture.root);

    assert.equal(result.status, 0);
    assert.match(
      result.output,
      /Migration manifest valid: 2 migrations verified with SHA-256/
    );
  } finally {
    fixture.cleanup();
  }
});

test("checksum mismatch fails", () => {
  const fixture = createFixture();

  try {
    writeFileSync(
      join(
        fixture.migrationsDirectory,
        fixture.migrations[0].name,
        "migration.sql"
      ),
      "CREATE TABLE changed_after_manifest (id TEXT);\n"
    );

    const result = runValidator(fixture.root);

    assert.notEqual(result.status, 0);
    assert.match(result.output, /Checksum mismatch/);
  } finally {
    fixture.cleanup();
  }
});

test("deleted migration fails", () => {
  const fixture = createFixture();

  try {
    rmSync(
      join(
        fixture.migrationsDirectory,
        fixture.migrations[1].name
      ),
      { recursive: true, force: true }
    );

    const result = runValidator(fixture.root);

    assert.notEqual(result.status, 0);
    assert.match(
      result.output,
      /deleted or renamed migration|Missing migration file/
    );
  } finally {
    fixture.cleanup();
  }
});

test("renamed migration fails", () => {
  const fixture = createFixture();

  try {
    renameSync(
      join(
        fixture.migrationsDirectory,
        fixture.migrations[1].name
      ),
      join(
        fixture.migrationsDirectory,
        "20260303000000_renamed_example"
      )
    );

    const result = runValidator(fixture.root);

    assert.notEqual(result.status, 0);
    assert.match(
      result.output,
      /Unregistered migration exists|deleted or renamed migration/
    );
  } finally {
    fixture.cleanup();
  }
});

test("duplicate manifest entry fails", () => {
  const fixture = createFixture();

  try {
    const manifest = readManifest(fixture.root);
    manifest.migrations.push({
      ...manifest.migrations[0],
      order: 3,
    });
    manifest.migrationCount = 3;
    overwriteManifest(fixture.root, manifest);

    const result = runValidator(fixture.root);

    assert.notEqual(result.status, 0);
    assert.match(
      result.output,
      /Duplicate migration name|Duplicate migration path|Duplicate SHA-256/
    );
  } finally {
    fixture.cleanup();
  }
});

test("missing migration.sql fails", () => {
  const fixture = createFixture();

  try {
    unlinkSync(
      join(
        fixture.migrationsDirectory,
        fixture.migrations[0].name,
        "migration.sql"
      )
    );

    const result = runValidator(fixture.root);

    assert.notEqual(result.status, 0);
    assert.match(result.output, /Missing migration file/);
  } finally {
    fixture.cleanup();
  }
});

test("appended migration without manifest update fails", () => {
  const fixture = createFixture();

  try {
    const appendedName = "20260404000000_unregistered";
    const appendedDirectory = join(
      fixture.migrationsDirectory,
      appendedName
    );

    mkdirSync(appendedDirectory, { recursive: true });
    writeFileSync(
      join(appendedDirectory, "migration.sql"),
      "CREATE TABLE unregistered_example (id TEXT);\n"
    );

    const result = runValidator(fixture.root);

    assert.notEqual(result.status, 0);
    assert.match(result.output, /Unregistered migration exists/);
  } finally {
    fixture.cleanup();
  }
});

test("migration_lock.toml is ignored", () => {
  const fixture = createFixture();

  try {
    writeFileSync(
      join(fixture.migrationsDirectory, "migration_lock.toml"),
      'provider = "postgresql"\n'
    );

    const result = runValidator(fixture.root);

    assert.equal(result.status, 0);
    assert.doesNotMatch(result.output, /migration_lock\.toml/);
  } finally {
    fixture.cleanup();
  }
});
