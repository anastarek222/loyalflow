import { getOwnBusinessApiActor } from "@/lib/api/v1/actor-context";
import {
  apiProblem,
  apiSuccess,
  internalApiProblem,
  methodNotAllowed,
  resolveRequestId,
} from "@/lib/api/v1/response";
import { getApiBusinessAccess } from "@/lib/business/api-access-query";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = resolveRequestId(request.headers);
  const resolution = await getOwnBusinessApiActor("CUSTOMERS_VIEW");

  if (!resolution.allowed) {
    if (resolution.problem === "AUTHENTICATION_REQUIRED") {
      return apiProblem({
        requestId,
        status: 401,
        code: resolution.problem,
        message: "Authentication is required.",
      });
    }
    if (resolution.problem === "CAPABILITY_REQUIRED") {
      return apiProblem({
        requestId,
        status: 403,
        code: resolution.problem,
        message: "The required capability is not available.",
      });
    }
    return apiProblem({
      requestId,
      status: 404,
      code: "RESOURCE_NOT_FOUND",
      message: "The requested resource was not found.",
    });
  }

  const actor = resolution.actor;
  if (!actor.businessId) {
    return apiProblem({
      requestId,
      status: 404,
      code: "RESOURCE_NOT_FOUND",
      message: "The requested resource was not found.",
    });
  }

  try {
    const access = await getApiBusinessAccess({ ...actor, businessId: actor.businessId });
    if (!access) {
      return apiProblem({
        requestId,
        status: 404,
        code: "RESOURCE_NOT_FOUND",
        message: "The requested resource was not found.",
      });
    }
    return apiSuccess(access, requestId);
  } catch {
    return internalApiProblem(requestId);
  }
}

export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
