const LOGIN_DATABASE_UNAVAILABLE_CODES = new Set([
  "P1001",
  "P1002",
  "P1008",
  "P1017",
  "P2024",
  "P2037",
  "P2039",
]);

function getNestedErrorCandidates(error: object): unknown[] {
  const candidates: unknown[] = [];
  const record = error as Record<string, unknown>;

  if ("cause" in record) candidates.push(record.cause);
  if ("err" in record) candidates.push(record.err);

  return candidates;
}

export function isLoginDatabaseUnavailableError(error: unknown): boolean {
  const queue: unknown[] = [error];
  const seen = new Set<object>();
  let inspected = 0;

  while (queue.length > 0 && inspected < 8) {
    const current = queue.shift();
    inspected += 1;

    if (!current || typeof current !== "object") continue;
    if (seen.has(current)) continue;
    seen.add(current);

    const record = current as Record<string, unknown>;
    if (
      typeof record.code === "string" &&
      LOGIN_DATABASE_UNAVAILABLE_CODES.has(record.code)
    ) {
      return true;
    }

    queue.push(...getNestedErrorCandidates(current));
  }

  return false;
}
