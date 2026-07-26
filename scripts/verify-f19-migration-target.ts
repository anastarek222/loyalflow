import assert from "node:assert/strict";

import prisma from "@/lib/prisma";
import { logServerError } from "@/lib/server/logging";

async function main() {
  const identity = await prisma.$queryRaw<Array<{ database: string }>>`
    SELECT current_database() AS database
  `;

  assert.equal(
    identity[0]?.database,
    "loyalflow_test",
    "Refusing F19.2 migration work outside the explicit loyalflow_test database.",
  );

  console.log("PASS: F19.2 migration target is loyalflow_test.");
}

main()
  .catch((error) => {
    logServerError("f19_migration_target_verification_failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
