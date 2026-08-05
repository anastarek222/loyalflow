import process from "node:process";
import { getEnvironmentIdentity } from "@/lib/server/environment-identity";

function safeReleaseSha(value: string | null) {
  if (!value) return null;
  return /^[a-f0-9]{7,64}$/i.test(value) ? value.slice(0, 12) : null;
}

function safeEnvironmentName(value: string | null) {
  if (!value) return "unknown";
  return /^[a-z0-9][a-z0-9_-]{1,31}$/i.test(value)
    ? value.toLowerCase()
    : "unknown";
}

export type PublicReleaseMetadata = Readonly<{
  environment: string;
  release: string | null;
}>;

export function getPublicReleaseMetadata(
  environment: NodeJS.ProcessEnv = process.env,
): PublicReleaseMetadata {
  const identity = getEnvironmentIdentity(environment);
  const environmentName = safeEnvironmentName(identity.environment);
  const release = safeReleaseSha(identity.release);

  return {
    environment: environmentName,
    release,
  };
}
