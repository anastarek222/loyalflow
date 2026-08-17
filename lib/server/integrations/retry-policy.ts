export const BETA_INTEGRATION_MAX_ATTEMPTS = 3;
export const BETA_QUEUE_BASE_RETRY_SECONDS = 30;
export const BETA_QUEUE_MAX_RETRY_SECONDS = 300;

function requirePositiveInteger(value: number, name: string) {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return value;
}

export function shouldRetryIntegrationFailure(input: Readonly<{
  retryable: boolean;
  attemptCount: number;
}>) {
  const attemptCount = requirePositiveInteger(input.attemptCount, "attemptCount");
  return input.retryable && attemptCount < BETA_INTEGRATION_MAX_ATTEMPTS;
}

export function getBetaQueueRetryDelaySeconds(deliveryCount: number) {
  const attempt = requirePositiveInteger(deliveryCount, "deliveryCount");
  return Math.min(
    BETA_QUEUE_MAX_RETRY_SECONDS,
    BETA_QUEUE_BASE_RETRY_SECONDS * 2 ** (attempt - 1),
  );
}
