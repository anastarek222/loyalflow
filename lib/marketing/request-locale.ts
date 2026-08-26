import { LOCALE_COOKIE_NAME, resolveRequestLocale } from "@/lib/i18n/request";
import { cookies } from "next/headers";

export async function getMarketingRequestLocale() {
  const cookieStore = await cookies();
  return resolveRequestLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value);
}
