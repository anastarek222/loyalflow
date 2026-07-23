import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const response = NextResponse.json({
    ok: true,
    service: "loyalflow",
    status: "live",
  });

  response.headers.set("Cache-Control", "no-store, max-age=0");

  return response;
}
