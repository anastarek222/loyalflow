import { NextResponse } from "next/server";

import { checkReadiness } from "@/lib/health/readiness";
import prisma from "@/lib/prisma";
import { logServerError } from "@/lib/server/logging";
import { getPublicReleaseMetadata } from "@/lib/server/release";
import { evaluateStagingIsolation } from "@/lib/server/staging-isolation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noStoreJson(
  body: Record<string, unknown>,
  status = 200
) {
  const response = NextResponse.json(body, {
    status,
  });

  response.headers.set(
    "Cache-Control",
    "no-store, max-age=0"
  );

  return response;
}

export async function GET() {
  let currentDatabase: string | null = null;
  const readiness = await checkReadiness(async () => {
    const rows = await prisma.$queryRaw<Array<{ current_database: string }>>`SELECT current_database()`;
    currentDatabase = rows[0]?.current_database ?? null;
  });

  if (readiness.status === 503) {
    logServerError(
      "database_readiness_probe_failed",
      new Error("Database readiness probe failed")
    );
  }

  const isolation = evaluateStagingIsolation(process.env, currentDatabase);
  if (!isolation.allowed) {
    logServerError(
      "staging_isolation_guard_failed",
      new Error(`Staging isolation guard failed: ${isolation.reason}`),
    );
    return noStoreJson(
      {
        ok: false,
        service: "loyalflow",
        status: "unavailable",
        ...getPublicReleaseMetadata(),
      },
      503,
    );
  }

  return noStoreJson({ ...readiness.body, ...getPublicReleaseMetadata() }, readiness.status);
}
