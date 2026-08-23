import "dotenv/config";
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Prisma loads this config for every CLI command. `prisma generate` does
    // not require a live database, so keep the URL optional at config-load
    // time. Database-dependent commands still fail closed when they attempt
    // to use an empty/missing datasource URL.
    url: process.env.DATABASE_URL ?? "",
    // A shadow database is only used by Prisma development workflows. It is
    // intentionally optional for status/deploy commands and runtime hosting.
    ...(process.env.SHADOW_DATABASE_URL?.trim()
      ? {
          shadowDatabaseUrl:
            process.env.SHADOW_DATABASE_URL.trim(),
        }
      : {}),
  },
});
