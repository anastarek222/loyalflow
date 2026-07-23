"use client";

import { useFormStatus } from "react-dom";
import { customerUiCopy } from "@/lib/customers/ui-copy";
import type { AppLanguage } from "@/lib/i18n";

export default function LoyaltySubmitButton({
  children,
  className,
  disabled = false,
  language = "AR",
}: {
  children: React.ReactNode;
  className: string;
  disabled?: boolean;
  language?: AppLanguage;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={disabled || pending} className={className}>
      {pending ? customerUiCopy(language).savePending : children}
    </button>
  );
}
