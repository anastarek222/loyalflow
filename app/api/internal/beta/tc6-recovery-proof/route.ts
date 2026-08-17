import { send } from "@vercel/queue";

import {
  INTEGRATION_RECOVERY_HEARTBEAT_TOPIC,
  type IntegrationRecoveryHeartbeatMessage,
} from "@/lib/server/integrations/reconciliation-heartbeat";

export const runtime = "nodejs";

function isAllowedStagingProofRequest(request: Request) {
  const commit = process.env.VERCEL_GIT_COMMIT_SHA;
  const environment = process.env.VERCEL_ENV;
  const branch = process.env.VERCEL_GIT_COMMIT_REF;
  const requestedCommit = new URL(request.url).searchParams.get("commit");

  return (
    environment === "preview" &&
    branch === "staging" &&
    typeof commit === "string" &&
    commit.length > 0 &&
    requestedCommit === commit
  );
}

export async function GET(request: Request) {
  if (!isAllowedStagingProofRequest(request)) {
    return new Response(null, { status: 404 });
  }

  const commit = process.env.VERCEL_GIT_COMMIT_SHA!;
  const scheduledForMs = Date.now();

  await send(
    INTEGRATION_RECOVERY_HEARTBEAT_TOPIC,
    { scheduledForMs } satisfies IntegrationRecoveryHeartbeatMessage,
    { idempotencyKey: `tc6-runtime-proof:${commit}` },
  );

  return Response.json(
    { ok: true, commit },
    { headers: { "cache-control": "no-store" } },
  );
}
