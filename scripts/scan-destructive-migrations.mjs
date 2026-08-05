#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const migrationsRoot = resolve(repoRoot, "prisma", "migrations");
const baselinePath = resolve(
  migrationsRoot,
  "destructive-sql-baseline.json"
);

const sha256Pattern = /^[a-f0-9]{64}$/;

const operationRules = [
  {
    operation: "DROP_TABLE",
    pattern: /\bDROP\s+TABLE\b/i,
  },
  {
    operation: "DROP_COLUMN",
    pattern: /\bALTER\s+TABLE\b[\s\S]*?\bDROP\s+COLUMN\b/i,
  },
  {
    operation: "DROP_SCHEMA",
    pattern: /\bDROP\s+SCHEMA\b/i,
  },
  {
    operation: "DROP_TYPE",
    pattern: /\bDROP\s+TYPE\b/i,
  },
  {
    operation: "DROP_INDEX",
    pattern: /\bDROP\s+INDEX\b/i,
  },
  {
    operation: "DROP_CONSTRAINT",
    pattern: /\bALTER\s+TABLE\b[\s\S]*?\bDROP\s+CONSTRAINT\b/i,
  },
  {
    operation: "TRUNCATE",
    pattern: /\bTRUNCATE(?:\s+TABLE)?\b/i,
  },
  {
    operation: "DELETE_DATA",
    pattern: /\bDELETE\s+FROM\b/i,
  },
  {
    operation: "UPDATE_DATA",
    pattern: /\bUPDATE\s+[\s\S]+?\s+SET\b/i,
  },
  {
    operation: "SET_NOT_NULL",
    pattern:
      /\bALTER\s+TABLE\b[\s\S]*?\bALTER\s+COLUMN\b[\s\S]*?\bSET\s+NOT\s+NULL\b/i,
  },
  {
    operation: "ALTER_COLUMN",
    pattern:
      /\bALTER\s+TABLE\b[\s\S]*?\bALTER\s+COLUMN\b/i,
  },
  {
    operation: "RENAME_TABLE",
    pattern: /\bALTER\s+TABLE\b[\s\S]*?\bRENAME\s+TO\b/i,
  },
  {
    operation: "RENAME_COLUMN",
    pattern:
      /\bALTER\s+TABLE\b[\s\S]*?\bRENAME\s+COLUMN\b/i,
  },
];

function fail(messages) {
  const list = Array.isArray(messages) ? messages : [messages];

  for (const message of list) {
    console.error(`ERROR: ${message}`);
  }

  process.exit(1);
}

function relativeToRepo(absolutePath) {
  return absolutePath
    .slice(repoRoot.length + 1)
    .split(sep)
    .join("/");
}

function normalizeStatement(statement) {
  return statement
    .replace(/--[^\n\r]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function hashStatement(statement) {
  return createHash("sha256")
    .update(statement, "utf8")
    .digest("hex");
}

function splitSqlStatements(sql) {
  const statements = [];
  let buffer = "";
  let startLine = 1;
  let line = 1;
  let state = "normal";
  let dollarTag = "";

  function startBufferIfNeeded(character) {
    if (buffer.length === 0 && !/\s/.test(character)) {
      startLine = line;
    }
  }

  for (let index = 0; index < sql.length; index += 1) {
    const character = sql[index];
    const next = sql[index + 1] ?? "";

    if (state === "line-comment") {
      buffer += character;

      if (character === "\n") {
        state = "normal";
        line += 1;
      }

      continue;
    }

    if (state === "block-comment") {
      buffer += character;

      if (character === "*" && next === "/") {
        buffer += next;
        index += 1;
        state = "normal";
        continue;
      }

      if (character === "\n") {
        line += 1;
      }

      continue;
    }

    if (state === "single-quote") {
      buffer += character;

      if (character === "'" && next === "'") {
        buffer += next;
        index += 1;
        continue;
      }

      if (character === "'") {
        state = "normal";
      }

      if (character === "\n") {
        line += 1;
      }

      continue;
    }

    if (state === "double-quote") {
      buffer += character;

      if (character === '"' && next === '"') {
        buffer += next;
        index += 1;
        continue;
      }

      if (character === '"') {
        state = "normal";
      }

      if (character === "\n") {
        line += 1;
      }

      continue;
    }

    if (state === "dollar-quote") {
      if (sql.startsWith(dollarTag, index)) {
        buffer += dollarTag;
        index += dollarTag.length - 1;
        state = "normal";
        continue;
      }

      buffer += character;

      if (character === "\n") {
        line += 1;
      }

      continue;
    }

    startBufferIfNeeded(character);

    if (character === "-" && next === "-") {
      buffer += character + next;
      index += 1;
      state = "line-comment";
      continue;
    }

    if (character === "/" && next === "*") {
      buffer += character + next;
      index += 1;
      state = "block-comment";
      continue;
    }

    if (character === "'") {
      buffer += character;
      state = "single-quote";
      continue;
    }

    if (character === '"') {
      buffer += character;
      state = "double-quote";
      continue;
    }

    if (character === "$") {
      const match = sql.slice(index).match(/^\$[A-Za-z0-9_]*\$/);

      if (match) {
        dollarTag = match[0];
        buffer += dollarTag;
        index += dollarTag.length - 1;
        state = "dollar-quote";
        continue;
      }
    }

    buffer += character;

    if (character === ";") {
      const normalized = normalizeStatement(buffer);

      if (normalized.length > 0) {
        statements.push({
          line: startLine,
          statement: normalized,
        });
      }

      buffer = "";
      startLine = line;
    }

    if (character === "\n") {
      line += 1;
    }
  }

  const trailing = normalizeStatement(buffer);

  if (trailing.length > 0) {
    statements.push({
      line: startLine,
      statement: trailing,
    });
  }

  return statements;
}

function maskSqlLiteralContents(statement) {
  return statement
    .replace(
      /(\$[A-Za-z0-9_]*\$)[\s\S]*?\1/g,
      (match, delimiter) => `${delimiter}${delimiter}`
    )
    .replace(/'(?:''|[^'])*'/g, "''");
}

function detectOperation(statement) {
  const detectionText = maskSqlLiteralContents(statement);

  for (const rule of operationRules) {
    if (rule.pattern.test(detectionText)) {
      return rule.operation;
    }
  }

  return null;
}

if (!existsSync(baselinePath)) {
  fail(
    "Missing prisma/migrations/destructive-sql-baseline.json."
  );
}

let baseline;

try {
  baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
} catch (error) {
  fail(`Invalid destructive SQL baseline JSON: ${error.message}`);
}

const errors = [];

if (baseline.version !== 1) {
  errors.push(
    `Baseline version must be 1; found ${String(baseline.version)}.`
  );
}

if (baseline.algorithm !== "sha256") {
  errors.push(
    `Baseline algorithm must be "sha256"; found ${String(
      baseline.algorithm
    )}.`
  );
}

if (!Array.isArray(baseline.entries)) {
  fail('Baseline field "entries" must be an array.');
}

if (baseline.entryCount !== baseline.entries.length) {
  errors.push(
    `entryCount is ${String(
      baseline.entryCount
    )}, but baseline contains ${baseline.entries.length} entries.`
  );
}

const baselineKeys = new Set();

for (const [index, entry] of baseline.entries.entries()) {
  const position = index + 1;

  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    errors.push(`Baseline entry ${position} must be an object.`);
    continue;
  }

  const { path, line, operation, statement, sha256 } = entry;

  if (
    typeof path !== "string" ||
    !/^prisma\/migrations\/[^/]+\/migration\.sql$/.test(path)
  ) {
    errors.push(
      `Invalid migration path in baseline entry ${position}: ${String(
        path
      )}.`
    );
  }

  if (!Number.isInteger(line) || line < 1) {
    errors.push(
      `Invalid line number in baseline entry ${position}: ${String(
        line
      )}.`
    );
  }

  if (
    typeof operation !== "string" ||
    !operationRules.some((rule) => rule.operation === operation)
  ) {
    errors.push(
      `Invalid operation in baseline entry ${position}: ${String(
        operation
      )}.`
    );
  }

  if (
    typeof statement !== "string" ||
    normalizeStatement(statement) !== statement
  ) {
    errors.push(
      `Baseline statement ${position} is not normalized.`
    );
  }

  if (typeof sha256 !== "string" || !sha256Pattern.test(sha256)) {
    errors.push(
      `Invalid SHA-256 in baseline entry ${position}: ${String(
        sha256
      )}.`
    );
  } else if (
    typeof statement === "string" &&
    hashStatement(statement) !== sha256
  ) {
    errors.push(
      `Baseline SHA-256 does not match statement at ${String(
        path
      )}:${String(line)}.`
    );
  }

  const key = `${String(path)}:${String(
    operation
  )}:${String(sha256)}`;

  if (baselineKeys.has(key)) {
    errors.push(
      `Duplicate destructive SQL baseline entry: ${key}.`
    );
  }

  baselineKeys.add(key);
}

const migrationFiles = readdirSync(migrationsRoot, {
  withFileTypes: true,
})
  .filter((entry) => entry.isDirectory())
  .map((entry) =>
    resolve(migrationsRoot, entry.name, "migration.sql")
  )
  .filter((filePath) => existsSync(filePath))
  .sort((left, right) =>
    relativeToRepo(left).localeCompare(relativeToRepo(right), "en")
  );

const detectedEntries = [];

for (const migrationFile of migrationFiles) {
  const relativePath = relativeToRepo(migrationFile);
  const sql = readFileSync(migrationFile, "utf8");

  for (const item of splitSqlStatements(sql)) {
    const operation = detectOperation(item.statement);

    if (!operation) {
      continue;
    }

    detectedEntries.push({
      path: relativePath,
      line: item.line,
      operation,
      statement: item.statement,
      sha256: hashStatement(item.statement),
    });
  }
}

const detectedKeys = new Set(
  detectedEntries.map(
    (entry) =>
      `${entry.path}:${entry.operation}:${entry.sha256}`
  )
);

const unreviewed = detectedEntries.filter(
  (entry) =>
    !baselineKeys.has(
      `${entry.path}:${entry.operation}:${entry.sha256}`
    )
);

const staleBaseline = baseline.entries.filter(
  (entry) =>
    !detectedKeys.has(
      `${entry.path}:${entry.operation}:${entry.sha256}`
    )
);

for (const entry of unreviewed) {
  errors.push(
    `Unreviewed destructive SQL: ${entry.path}:${entry.line} ` +
      `[${entry.operation}] ${entry.statement}`
  );
}

for (const entry of staleBaseline) {
  errors.push(
    `Stale destructive SQL baseline entry: ${entry.path}:${entry.line} ` +
      `[${entry.operation}] ${entry.statement}`
  );
}

if (errors.length > 0) {
  fail(errors);
}

console.log(
  `Destructive SQL scan valid: ${migrationFiles.length} migrations scanned, ` +
    `${detectedEntries.length} reviewed statements, 0 unreviewed.`
);
