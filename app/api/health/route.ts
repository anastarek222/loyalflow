import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";

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
  try {
    await prisma.$queryRaw`SELECT 1`;

    return noStoreJson({
      ok: true,
      service: "loyalflow",
      database: "connected",
    });
  } catch {
    console.error(
      "LoyalFlow database health check failed."
    );

    return noStoreJson(
      {
        ok: false,
        service: "loyalflow",
        database: "disconnected",
      },
      503
    );
  }
}
