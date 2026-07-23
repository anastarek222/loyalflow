import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

import { validateRuntimeEnvironment } from "@/lib/server/environment";

const { databaseUrl: connectionString } =
  validateRuntimeEnvironment();

const adapter = new PrismaPg({
  connectionString,
});

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
