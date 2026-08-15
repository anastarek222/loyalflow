import { send } from "@vercel/queue";

export const INTEGRATION_JOB_TOPIC = "loyalflow-integration-jobs-beta";

export type IntegrationJobMessage = Readonly<{ jobId: string }>;

export type IntegrationJobTransport = Readonly<{
  publish(message: IntegrationJobMessage): Promise<void>;
}>;

function requireJobId(value: string) {
  const jobId = value.trim();
  if (jobId.length < 1 || jobId.length > 200) {
    throw new Error("jobId must contain between 1 and 200 characters.");
  }
  return jobId;
}

const vercelQueueTransport: IntegrationJobTransport = {
  async publish(message) {
    const jobId = requireJobId(message.jobId);
    await send(
      INTEGRATION_JOB_TOPIC,
      { jobId } satisfies IntegrationJobMessage,
      { idempotencyKey: `integration-job:${jobId}` },
    );
  },
};

export async function publishIntegrationJob(
  message: IntegrationJobMessage,
  transport: IntegrationJobTransport = vercelQueueTransport,
) {
  await transport.publish({ jobId: requireJobId(message.jobId) });
}

export function parseIntegrationJobMessage(
  value: unknown,
): IntegrationJobMessage {
  if (
    !value ||
    typeof value !== "object" ||
    !("jobId" in value) ||
    typeof value.jobId !== "string"
  ) {
    throw new Error("Invalid integration job message.");
  }
  return { jobId: requireJobId(value.jobId) };
}
