import type { ApiLivenessRead } from "@loyalflow/contracts/api/v1";

import { apiSuccess, resolveRequestId } from "@/lib/api/v1/response";
import { getPublicReleaseMetadata } from "@/lib/server/release";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = resolveRequestId(request.headers);
  const data: ApiLivenessRead = {
    service: "loyalflow",
    status: "live",
    ...getPublicReleaseMetadata(),
  };

  return apiSuccess(data, requestId);
}
