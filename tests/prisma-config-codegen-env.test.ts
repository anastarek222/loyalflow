import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const prismaConfigPath = new URL("../prisma.config.ts", import.meta.url);

test("Prisma config keeps DATABASE_URL optional while loading codegen config", async () => {
  const source = await readFile(prismaConfigPath, "utf8");

  assert.match(source, /url:\s*process\.env\.DATABASE_URL\s*\?\?\s*["']{2}/);
  assert.doesNotMatch(source, /env\(["']DATABASE_URL["']\)/);
});
