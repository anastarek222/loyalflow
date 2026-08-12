import { auth } from "@/auth";
import { resolveApiActor } from "@/lib/api/v1/actor-policy";
import type { Capability } from "@/lib/permissions";

export type {
  ApiActorContext,
  ApiActorResolution,
} from "@/lib/api/v1/actor-policy";

export async function getApiActor(input: {
  selectedBusinessId?: string;
  capability?: Capability;
} = {}) {
  return resolveApiActor({ session: await auth(), ...input });
}
