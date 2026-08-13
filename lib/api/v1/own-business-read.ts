import type { Capability } from "@/lib/permissions";
import { getOwnBusinessApiActor } from "@/lib/api/v1/actor-context";
import type { ApiActorContext } from "@/lib/api/v1/actor-policy";
import { apiProblem, resolveRequestId } from "@/lib/api/v1/response";

export type OwnBusinessReadResolution =
  | Readonly<{
      allowed: true;
      requestId: string;
      actor: ApiActorContext & { businessId: string };
    }>
  | Readonly<{ allowed: false; response: Response }>;

/** Shared auth/tenant/capability boundary for protected own-business reads. */
export async function resolveOwnBusinessRead(
  request: Request,
  capability: Capability,
): Promise<OwnBusinessReadResolution> {
  const requestId = resolveRequestId(request.headers);
  const resolution = await getOwnBusinessApiActor(capability);

  if (!resolution.allowed) {
    if (resolution.problem === "AUTHENTICATION_REQUIRED") {
      return {
        allowed: false,
        response: apiProblem({
          requestId,
          status: 401,
          code: resolution.problem,
          message: "Authentication is required.",
        }),
      };
    }
    if (resolution.problem === "CAPABILITY_REQUIRED") {
      return {
        allowed: false,
        response: apiProblem({
          requestId,
          status: 403,
          code: resolution.problem,
          message: "The required capability is not available.",
        }),
      };
    }
    return {
      allowed: false,
      response: apiProblem({
        requestId,
        status: 404,
        code: "RESOURCE_NOT_FOUND",
        message: "The requested resource was not found.",
      }),
    };
  }

  if (!resolution.actor.businessId) {
    return {
      allowed: false,
      response: apiProblem({
        requestId,
        status: 404,
        code: "RESOURCE_NOT_FOUND",
        message: "The requested resource was not found.",
      }),
    };
  }

  return {
    allowed: true,
    requestId,
    actor: { ...resolution.actor, businessId: resolution.actor.businessId },
  };
}
