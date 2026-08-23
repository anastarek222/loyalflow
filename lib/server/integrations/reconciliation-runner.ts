import prisma from "@/lib/prisma";
import { reconcileStrandedIntegrationJobs } from "@/lib/server/integrations/reconciliation";

export type RunIntegrationJobReconciliationInput = Readonly<{
  now?: Date;
  limit?: number;
}>;

/**
 * Internal invocation boundary for stranded integration-job recovery.
 * Scheduling, HTTP routing, authentication, and environment wiring stay outside
 * this module so Beta recovery policy can be validated independently.
 */
export async function runStrandedIntegrationJobReconciliation(
  input: RunIntegrationJobReconciliationInput = {},
) {
  return reconcileStrandedIntegrationJobs(prisma, {
    now: input.now ?? new Date(),
    ...(input.limit === undefined ? {} : { limit: input.limit }),
  });
}
