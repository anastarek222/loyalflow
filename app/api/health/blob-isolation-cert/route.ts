import { list } from "@vercel/blob";
import { NextResponse } from "next/server";

const STAGING_BLOB_STORE_ID = "xkfdamj6w49ivkjl";

export const dynamic = "force-dynamic";

function classifyBlobError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  if (message.includes("oidc") && message.includes("environment") && message.includes("not allowed")) {
    return "oidc_environment_not_allowed";
  }
  if (message.includes("access denied") || message.includes("forbidden")) {
    return "access_denied";
  }
  if (message.includes("store") && message.includes("does not exist")) {
    return "store_not_found";
  }
  if (message.includes("no blob credentials")) {
    return "credentials_missing";
  }
  return "other";
}

export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const result = await list({
      storeId: STAGING_BLOB_STORE_ID,
      prefix: "custom-card/",
      limit: 1,
    });

    return NextResponse.json({
      ok: true,
      environment: "preview",
      storeHost: `${STAGING_BLOB_STORE_ID}.private.blob.vercel-storage.com`,
      readable: true,
      sampleCount: result.blobs.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        environment: "preview",
        readable: false,
        classification: classifyBlobError(error),
      },
      { status: 503 },
    );
  }
}
