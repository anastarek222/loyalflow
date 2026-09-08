import { list } from "@vercel/blob";
import { NextResponse } from "next/server";

const PREVIEW_BLOB_STORE_ID = "zCVSiqC7bhMHfVqW";
const VERCEL_PROJECT_ID = "prj_XR2myqPuensw4MTYF5Rgi0w0MPMG";
const VERCEL_TEAM_ID = "team_JIxldEzYlted09P36umRYSLa";

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

function classifyVercelApiStatus(status: number) {
  if (status === 200) return "oidc_rest_api_accepted";
  if (status === 401) return "oidc_rest_api_unauthorized";
  if (status === 403) return "oidc_rest_api_forbidden";
  return `oidc_rest_api_status_${status}`;
}

async function probeVercelApiAuth() {
  const oidcToken = process.env.VERCEL_OIDC_TOKEN?.trim();
  if (!oidcToken) {
    return NextResponse.json(
      {
        ok: false,
        environment: "preview",
        classification: "oidc_missing",
      },
      { status: 503 },
    );
  }

  const response = await fetch(
    `https://api.vercel.com/v6/deployments?projectId=${encodeURIComponent(VERCEL_PROJECT_ID)}&teamId=${encodeURIComponent(VERCEL_TEAM_ID)}&limit=1`,
    {
      headers: {
        Authorization: `Bearer ${oidcToken}`,
      },
      cache: "no-store",
    },
  );

  return NextResponse.json({
    ok: response.ok,
    environment: "preview",
    status: response.status,
    classification: classifyVercelApiStatus(response.status),
  });
}

export async function GET(request: Request) {
  if (process.env.VERCEL_ENV !== "preview") {
    return new NextResponse(null, { status: 404 });
  }

  const url = new URL(request.url);
  if (url.searchParams.get("mode") === "vercel-api-auth") {
    return probeVercelApiAuth();
  }

  try {
    const result = await list({
      storeId: PREVIEW_BLOB_STORE_ID,
      prefix: "custom-card/",
      limit: 1,
    });

    return NextResponse.json({
      ok: true,
      environment: "preview",
      storeHost: `${PREVIEW_BLOB_STORE_ID.toLowerCase()}.private.blob.vercel-storage.com`,
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
