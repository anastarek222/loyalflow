import "dotenv/config";

import assert from "node:assert/strict";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client";
import { assertDatabaseScriptEnvironment } from "../lib/server/database-script-guard";

assertDatabaseScriptEnvironment("staging-seed-fixture");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not configured");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const UAT_EMAIL = /^lf-uat-final-(?:owner-a|manager-a|staff-a|viewer-a|inactive-user|owner-b|owner-sales|inactive-owner|pending-owner|provisioned-owner|invited-owner|superadmin)-[a-f0-9]{8,24}@example\.test$/;

try {
  const orphanUsers = await prisma.user.findMany({
    where: {
      email: { startsWith: "lf-uat-final-", endsWith: "@example.test" },
      businessId: null,
    },
    select: { id: true, email: true },
  });

  assert.ok(
    orphanUsers.every((user) => UAT_EMAIL.test(user.email)),
    "Refusing to delete an orphan user outside the strict final-UAT identity pattern.",
  );

  if (orphanUsers.length) {
    await prisma.user.deleteMany({
      where: { id: { in: orphanUsers.map((user) => user.id) }, businessId: null },
    });
  }

  console.log(`UAT ORPHAN CLEANUP COMPLETE: removed ${orphanUsers.length} synthetic user(s).`);
} finally {
  await prisma.$disconnect();
}
