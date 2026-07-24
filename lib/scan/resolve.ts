export const SCAN_RESOLVE_ERROR_CODES = [
  "UNAUTHENTICATED",
  "INVALID_INPUT",
  "FORBIDDEN",
  "RATE_LIMITED",
  "INVALID_CARD",
  "CUSTOMER_NOT_FOUND",
  "UNKNOWN",
] as const;

export type ScanResolveErrorCode =
  (typeof SCAN_RESOLVE_ERROR_CODES)[number];

export type ScanResolveErrorResponse = {
  ok: false;
  code: ScanResolveErrorCode;
};

export type ScanResolveSuccessResponse = {
  ok: true;
  url: string;
};

export function scanResolveError(
  code: ScanResolveErrorCode
): ScanResolveErrorResponse {
  return { ok: false, code };
}

export function getScanResolveErrorCode(
  response: unknown
): ScanResolveErrorCode {
  if (
    typeof response === "object" &&
    response !== null &&
    "code" in response &&
    typeof response.code === "string" &&
    SCAN_RESOLVE_ERROR_CODES.includes(
      response.code as ScanResolveErrorCode
    )
  ) {
    return response.code as ScanResolveErrorCode;
  }

  return "UNKNOWN";
}

export function isScanResolveSuccessResponse(
  response: unknown
): response is ScanResolveSuccessResponse {
  return (
    typeof response === "object" &&
    response !== null &&
    "ok" in response &&
    response.ok === true &&
    "url" in response &&
    typeof response.url === "string"
  );
}
