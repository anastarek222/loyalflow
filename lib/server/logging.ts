type LogContext = Readonly<Record<string, boolean | number | string>>;

const connectionUrlPattern = /\b[a-z][a-z\d+.-]*:\/\/[^\s'"`]+/gi;
const sensitiveAssignmentPattern = /\b(password|secret|token|api[_-]?key)\s*([=:])\s*[^\s,;]+/gi;

export function getSafeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error";

  return message
    .replace(connectionUrlPattern, "[redacted-url]")
    .replace(sensitiveAssignmentPattern, "$1$2[redacted]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

/** Logs a compact, redacted server event. Never pass customer records or secrets. */
export function logServerError(
  event: string,
  error: unknown,
  context?: LogContext
) {
  console.error(
    JSON.stringify({
      level: "error",
      event,
      message: getSafeErrorMessage(error),
      ...context,
    })
  );
}
