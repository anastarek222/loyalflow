import { NextResponse } from "next/server";

import { checkReadiness } from "@/lib/health/readiness";
import prisma from "@/lib/prisma";
import { logServerError } from "@/lib/server/logging";
import { getPublicReleaseMetadata } from "@/lib/server/release";
import { evaluateStagingIsolation } from "@/lib/server/staging-isolation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function formatDuration(durationMs: number) {
  return Math.max(0, durationMs).toFixed(1);
}

function noStoreJson(
  body: Record<string, unknown>,
  status = 200,
  timings?: { databaseMs: number; totalMs: number },
) {
  const response = NextResponse.json(body, {
    status,
  });

  response.headers.set("Cache-Control", "no-store, max-age=0");

  if (timings) {
    response.headers.set(
      "Server-Timing",
      `db;dur=${formatDuration(timings.databaseMs)}, total;dur=${formatDuration(timings.totalMs)}`,
    );
  }

  return response;
}

export async function GET() {
  const startedAt = performance.now();
  const databaseStartedAt = performance.now();
  const readiness = await checkReadiness(async () => {
    await prisma.$queryRaw`SELECT 1`;
  });
  const databaseMs = performance.now() - databaseStartedAt;

  if (readiness.status === 503) {
    logServerError(
      "database_readiness_probe_failed",
      new Error("Database readiness probe failed"),
    );
  }

  const isolation = evaluateStagingIsolation(
    process.env,
    process.env.DATABASE_URL,
  );
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
      {
        databaseMs,
        totalMs: performance.now() - startedAt,
      },
    );
  }

  return noStoreJson(
    { ...readiness.body, ...getPublicReleaseMetadata() },
    readiness.status,
    {
      databaseMs,
      totalMs: performance.now() - startedAt,
    },
  );
}
