import { readPrivateCustomCardArtwork } from "@/lib/cards/custom-card-storage";
import { del, list, put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

const PREVIEW_BLOB_STORE_ID = "zCVSiqC7bhMHfVqW";

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
  if (message.includes("readback_missing")) {
    return "readback_missing";
  }
  return "other";
}

export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") {
    return new NextResponse(null, { status: 404 });
  }

  const nonce = randomUUID();
  const marker = `tanee-preview-blob-cert:${nonce}`;
  const pathname = `custom-card/__cert__/${nonce}/front.txt`;
  let uploadedUrl: string | null = null;
  let cleanupAttempted = false;
  let cleanupVerified = false;

  try {
    const uploaded = await put(pathname, marker, {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: "text/plain; charset=utf-8",
    });
    uploadedUrl = uploaded.url;

    const readback = await readPrivateCustomCardArtwork(uploaded.url);
    if (!readback) throw new Error("readback_missing");
    const readbackText = await new Response(readback.stream).text();
    const readbackVerified = readbackText === marker;

    await del(uploaded.url);
    cleanupAttempted = true;
    uploadedUrl = null;
    const remaining = await list({ prefix: pathname, limit: 1 });
    cleanupVerified = remaining.blobs.length === 0;

    return NextResponse.json(
      {
        ok: readbackVerified && cleanupVerified,
        environment: "preview",
        storeHost: `${PREVIEW_BLOB_STORE_ID.toLowerCase()}.private.blob.vercel-storage.com`,
        uploaded: true,
        readbackVerified,
        cleanupAttempted,
        cleanupVerified,
      },
      { status: readbackVerified && cleanupVerified ? 200 : 503 },
    );
  } catch (error) {
    if (uploadedUrl) {
      try {
        await del(uploadedUrl);
        cleanupAttempted = true;
        const remaining = await list({ prefix: pathname, limit: 1 });
        cleanupVerified = remaining.blobs.length === 0;
      } catch {
        cleanupAttempted = true;
      }
    }

    return NextResponse.json(
      {
        ok: false,
        environment: "preview",
        uploaded: Boolean(uploadedUrl) || cleanupAttempted,
        readbackVerified: false,
        cleanupAttempted,
        cleanupVerified,
        classification: classifyBlobError(error),
      },
      { status: 503 },
    );
  }
}
