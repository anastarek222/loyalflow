export type ApiV1WriteTransport = "SERVER_ACTION" | "ROUTE_HANDLER";

export type ApiV1IdempotencyPolicy =
  | "REPLAY_SAFE"
  | "IDEMPOTENCY_KEY_REQUIRED"
  | "NOT_APPLICABLE";

export type ApiV1TransactionPolicy =
  | "AUTHORITATIVE_TRANSACTION"
  | "AUTHORITATIVE_TRANSACTION_WITH_OUTBOX";

export type ApiV1WriteBoundaryInput = Readonly<{
  transport: ApiV1WriteTransport;
  actorSource: "SERVER_SESSION" | "CLIENT_SUPPLIED";
  tenantSource: "SERVER_SESSION" | "CLIENT_SUPPLIED";
  sameOriginCsrfGuard: boolean;
  idempotencyPolicy: ApiV1IdempotencyPolicy;
  transactionPolicy: ApiV1TransactionPolicy;
}>;

export type ApiV1WriteBoundaryDecision = Readonly<{
  allowed: boolean;
  reasons: readonly string[];
}>;

/**
 * TC5 write-boundary policy.
 *
 * Existing Server Actions remain the compatibility transport while safe writes
 * are extracted into server command boundaries. A new Route Handler write is
 * fail-closed until it proves an explicit same-origin CSRF guard.
 * Actor and tenant authority must always come from the authenticated server
 * session; clients may never select either authority.
 */
export function evaluateApiV1WriteBoundary(
  input: ApiV1WriteBoundaryInput,
): ApiV1WriteBoundaryDecision {
  const reasons: string[] = [];

  if (input.actorSource !== "SERVER_SESSION") {
    reasons.push("actor-must-be-server-derived");
  }
  if (input.tenantSource !== "SERVER_SESSION") {
    reasons.push("tenant-must-be-server-derived");
  }
  if (input.transport === "ROUTE_HANDLER" && !input.sameOriginCsrfGuard) {
    reasons.push("route-handler-write-requires-same-origin-csrf-guard");
  }

  return {
    allowed: reasons.length === 0,
    reasons,
  };
}

export const apiV1SafeWriteDefaults = Object.freeze({
  transport: "SERVER_ACTION" as const,
  actorSource: "SERVER_SESSION" as const,
  tenantSource: "SERVER_SESSION" as const,
  sameOriginCsrfGuard: true,
  idempotencyPolicy: "NOT_APPLICABLE" as const,
  transactionPolicy: "AUTHORITATIVE_TRANSACTION" as const,
});
