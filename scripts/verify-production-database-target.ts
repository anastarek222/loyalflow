import process from "node:process";

import {
  EnvironmentValidationError,
  validateProductionEnvironment,
} from "@/lib/server/environment";
import { logServerError } from "@/lib/server/logging";

function looksNonProduction(database: string) {
  return /(^|[_-])(test|dev|development|local|staging)([_-]|$)/i.test(database);
}

async function main() {
  let prisma: (typeof import("@/lib/prisma"))["default"] | null = null;

  try {
    const environment = validateProductionEnvironment(process.env);

    const expectedDatabase = environment.productionDatabaseName;
    if (!expectedDatabase) {
      throw new EnvironmentValidationError(
        "LOYALFLOW_PRODUCTION_DATABASE is required."
      );
    }

    const prismaModule = await import("@/lib/prisma");
    prisma = prismaModule.default;

    const identity = await prisma.$queryRaw<Array<{ database: string }>>`
      SELECT current_database() AS database
    `;
    const actualDatabase = identity[0]?.database ?? "";

    if (!actualDatabase || actualDatabase !== expectedDatabase) {
      throw new Error(
        "Connected database does not match LOYALFLOW_PRODUCTION_DATABASE."
      );
    }

    if (looksNonProduction(actualDatabase)) {
      throw new Error(
        "Connected database name looks like a non-production environment."
      );
    }

    console.log(
      "PASS: exact production database target verified without printing credentials."
    );
  } finally {
    if (prisma) await prisma.$disconnect();
  }
}

main().catch((error) => {
  if (error instanceof EnvironmentValidationError) {
    console.error(`FAIL: ${error.message}`);
  } else {
    logServerError("production_database_target_verification_failed", error);
    console.error("FAIL: production database target verification failed.");
  }
  process.exitCode = 1;
});
