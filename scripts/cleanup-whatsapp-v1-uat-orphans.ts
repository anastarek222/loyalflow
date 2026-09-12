import "dotenv/config";

import assert from "node:assert/strict";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client";
import { assertDatabaseScriptEnvironment } from "../lib/server/database-script-guard";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not configured");

assertDatabaseScriptEnvironment("staging-seed-fixture");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const emailPattern = /^lf-uat-final-[a-z-]+-[a-f0-9]{10}@example\.test$/;

try {
  const users = await prisma.user.findMany({
    where: {
      email: { startsWith: "lf-uat-final-", endsWith: "@example.test" },
      businessId: null,
    },
    select: { id: true, email: true, businessId: true },
  });

  assert.ok(users.every((user) => user.businessId === null && emailPattern.test(user.email)),
    "Refusing to delete any user outside the detached final-UAT namespace.");

  if (users.length) {
    await prisma.user.deleteMany({ where: { id: { in: users.map((user) => user.id) } } });
  }

  const remaining = await prisma.user.count({
    where: {
      email: { startsWith: "lf-uat-final-", endsWith: "@example.test" },
      businessId: null,
    },
  });

  assert.equal(remaining, 0, "Detached final-UAT users remain after cleanup.");
  console.log(`Detached final-UAT cleanup complete (${users.length} removed).`);
} finally {
  await prisma.$disconnect();
}
