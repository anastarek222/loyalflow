import type { Session } from "next-auth";

import {
  canPerform,
  type Capability,
  type TenantUser,
} from "@/lib/permissions";

export type ApiActorContext = Readonly<{
  userId: string;
  businessId: string | null;
  role: TenantUser["role"];
}>;

export type ApiActorResolution =
  | Readonly<{ allowed: true; actor: ApiActorContext }>
  | Readonly<{
      allowed: false;
      problem:
        | "AUTHENTICATION_REQUIRED"
        | "RESOURCE_NOT_FOUND"
        | "CAPABILITY_REQUIRED";
    }>;

export function resolveApiActor(input: {
  session: Session | null;
  selectedBusinessId?: string;
  capability?: Capability;
}): ApiActorResolution {
  const user = input.session?.user;
  if (!user?.id) {
    return { allowed: false, problem: "AUTHENTICATION_REQUIRED" };
  }

  if (input.selectedBusinessId) {
    const sameTenant =
      user.role === "SUPER_ADMIN" ||
      user.businessId === input.selectedBusinessId;
    if (!sameTenant) {
      return { allowed: false, problem: "RESOURCE_NOT_FOUND" };
    }
    if (
      input.capability &&
      !canPerform(user, input.selectedBusinessId, input.capability)
    ) {
      return { allowed: false, problem: "CAPABILITY_REQUIRED" };
    }
  }

  return {
    allowed: true,
    actor: {
      userId: user.id,
      businessId: user.businessId,
      role: user.role,
    },
  };
}
