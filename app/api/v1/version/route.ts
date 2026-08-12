import type { ApiVersionRead } from "@loyalflow/contracts/api/v1";
import { loyalFlowApiVersion } from "@loyalflow/contracts/api/v1";

import { apiSuccess, resolveRequestId } from "@/lib/api/v1/response";
import { getPublicReleaseMetadata } from "@/lib/server/release";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = resolveRequestId(request.headers);
  const release = getPublicReleaseMetadata();
  const data: ApiVersionRead = {
    service: "loyalflow",
    version: loyalFlowApiVersion,
    stability: "INTERNAL_FOUNDATION",
    ...release,
  };

  return apiSuccess(data, requestId);
}
