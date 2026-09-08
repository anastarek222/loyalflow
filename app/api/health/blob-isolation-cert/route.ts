import { list } from "@vercel/blob";
import { NextResponse } from "next/server";

const STAGING_BLOB_STORE_ID = "xkfdamj6w49ivkjl";

export const dynamic = "force-dynamic";

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
        error: error instanceof Error ? error.name : "UnknownError",
      },
      { status: 503 },
    );
  }
}
