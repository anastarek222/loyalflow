import {
  apiProblem,
  apiSuccess,
  internalApiProblem,
  methodNotAllowed,
} from "@/lib/api/v1/response";
import { resolveOwnBusinessRead } from "@/lib/api/v1/own-business-read";
import { getApiBusinessSummary } from "@/lib/business/api-summary-query";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const resolution = await resolveOwnBusinessRead(request, "CUSTOMERS_VIEW");
  if (!resolution.allowed) return resolution.response;
  const { requestId, actor } = resolution;

  try {
    const summary = await getApiBusinessSummary(actor.businessId);
    if (!summary) {
      return apiProblem({
        requestId,
        status: 404,
        code: "RESOURCE_NOT_FOUND",
        message: "The requested resource was not found.",
      });
    }
    return apiSuccess(summary, requestId);
  } catch {
    return internalApiProblem(requestId);
  }
}

export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
