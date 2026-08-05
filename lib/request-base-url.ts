import { getCanonicalPublicAppUrl } from "@/lib/public-app-url";

export async function getRequestBaseUrl() {
  return getCanonicalPublicAppUrl();
}
