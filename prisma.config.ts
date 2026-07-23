import "dotenv/config";
import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
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
