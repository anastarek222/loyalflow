import { NextResponse } from "next/server";

import { checkReadiness } from "@/lib/health/readiness";
import prisma from "@/lib/prisma";
import { logServerError } from "@/lib/server/logging";

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
  const readiness = await checkReadiness(
    () => prisma.$queryRaw`SELECT 1`
  );

  if (readiness.status === 503) {
    logServerError(
      "database_readiness_probe_failed",
      new Error("Database readiness probe failed")
    );
  }

  return noStoreJson(readiness.body, readiness.status);
}
