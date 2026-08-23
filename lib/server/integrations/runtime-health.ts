import "server-only";

import { summarizeIntegrationRuntimeHealth } from "@/lib/integrations/runtime-health";
import prisma from "@/lib/prisma";

export async function readIntegrationRuntimeHealth() {
  const groups = await prisma.business.groupBy({
    by: ["googleSheetsSyncState", "googleSheetsRetryable"],
    _count: { _all: true },
  });

  return summarizeIntegrationRuntimeHealth(
    groups.map((group) => ({
      syncState: group.googleSheetsSyncState,
      retryable: group.googleSheetsRetryable,
      count: group._count._all,
    })),
  );
}
