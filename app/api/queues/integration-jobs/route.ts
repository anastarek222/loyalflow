import { handleCallback } from "@vercel/queue";

import { getBetaQueueRetryDelaySeconds } from "@/lib/server/integrations/retry-policy";
import { processIntegrationJob } from "@/lib/server/integrations/worker";
import {
  parseIntegrationJobMessage,
  type IntegrationJobMessage,
} from "@/lib/server/integrations/transport";

export const runtime = "nodejs";

const queueCallback = handleCallback<IntegrationJobMessage>(
  async (message, metadata) => {
    const { jobId } = parseIntegrationJobMessage(message);
    await processIntegrationJob(jobId, metadata.messageId);
  },
  {
    visibilityTimeoutSeconds: 300,
    retry: (_error, metadata) => ({
      afterSeconds: getBetaQueueRetryDelaySeconds(metadata.deliveryCount),
    }),
  },
);

export function POST(request: Request) {
  return queueCallback(request);
}
