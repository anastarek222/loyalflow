import { handleCallback } from "@/lib/server/integrations/queue-client";

import {
  parseIntegrationRecoveryHeartbeatMessage,
  processIntegrationRecoveryHeartbeat,
  type IntegrationRecoveryHeartbeatMessage,
} from "@/lib/server/integrations/reconciliation-heartbeat";

export const runtime = "nodejs";

const queueCallback = handleCallback<IntegrationRecoveryHeartbeatMessage>(
  async (message) => {
    const heartbeat = parseIntegrationRecoveryHeartbeatMessage(message);
    await processIntegrationRecoveryHeartbeat(heartbeat);
  },
  { visibilityTimeoutSeconds: 300 },
);

export function POST(request: Request) {
  return queueCallback(request);
}
