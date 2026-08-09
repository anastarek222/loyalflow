export function isValidAuthVersion(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
  );
}

export function isCurrentAuthVersion(
  tokenAuthVersion: unknown,
  currentAuthVersion: unknown,
): boolean {
  return (
    isValidAuthVersion(tokenAuthVersion) &&
    isValidAuthVersion(currentAuthVersion) &&
    tokenAuthVersion === currentAuthVersion
  );
}
