import { handleCallback } from "@vercel/queue";

import {
  parseIntegrationRecoveryHeartbeatMessage,
  processIntegrationRecoveryHeartbeat,
  type IntegrationRecoveryHeartbeatMessage,
} from "@/lib/server/integrations/reconciliation-heartbeat";

export const runtime = "nodejs";

const queueCallback = handleCallback<IntegrationRecoveryHeartbeatMessage>(
  async (message) => {
    parseIntegrationRecoveryHeartbeatMessage(message);
    await processIntegrationRecoveryHeartbeat();
  },
  { visibilityTimeoutSeconds: 300 },
);

export function POST(request: Request) {
  return queueCallback(request);
}
