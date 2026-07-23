"use client";

import { ArrowUpRight } from "lucide-react";

type Props = {
  language: "AR" | "EN";
};

export default function OpenAdvancedDashboardButton({ language }: Props) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("loyalflow:open-experience-mode"))}
      className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline"
    >
      {language === "AR" ? "فتح لوحة التحكم المتقدمة" : "Open advanced dashboard"}
      <ArrowUpRight className="ms-2" size={16} aria-hidden="true" />
    </button>
  );
}
