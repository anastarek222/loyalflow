"use client";

import { useFormStatus } from "react-dom";
import { scanUiCopy } from "@/lib/scan/copy";
import type { AppLanguage } from "@/lib/i18n";

type ScanActionButtonProps = {
  children: React.ReactNode;
  language: AppLanguage;
};

export default function ScanActionButton({
  children,
  language,
}: ScanActionButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      aria-busy={pending}
      className="w-full rounded-[var(--lf-radius-input)] bg-foreground px-6 py-4 font-black text-white transition disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? scanUiCopy(language).pendingAction : children}
    </button>
  );
}
