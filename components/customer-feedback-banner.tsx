"use client";

import {
  getCustomerPlanLimitMessage,
  parseCustomerFeedbackCode,
} from "@/lib/customers/feedback";
import type { SupportedLocale } from "@/lib/i18n/config";
import { usePathname, useSearchParams } from "next/navigation";

const customersPathPattern = /^\/businesses\/[^/]+\/customers\/?$/;

type CustomerFeedbackBannerProps = {
  locale: SupportedLocale;
};

export function CustomerFeedbackBanner({ locale }: CustomerFeedbackBannerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!customersPathPattern.test(pathname)) {
    return null;
  }

  const feedbackCode = parseCustomerFeedbackCode(searchParams.get("error"));
  if (feedbackCode !== "plan-limit") {
    return null;
  }

  return (
    <div
      role="alert"
      className="fixed inset-x-4 top-4 z-[100] mx-auto max-w-2xl rounded-[var(--lf-radius-input)] border border-warning/30 bg-warning-subtle px-4 py-4 text-sm font-semibold text-warning shadow-lg sm:inset-x-6"
    >
      {getCustomerPlanLimitMessage(locale)}
    </div>
  );
}
