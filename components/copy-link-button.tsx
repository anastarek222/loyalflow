"use client";

import { useState } from "react";
import { customerUiCopy } from "@/lib/customers/ui-copy";
import type { AppLanguage } from "@/lib/i18n";

type CopyLinkButtonProps = {
  value: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  language?: AppLanguage;
};

export default function CopyLinkButton({
  value,
  label,
  copiedLabel,
  className,
  language = "AR",
}: CopyLinkButtonProps) {
  const copy = customerUiCopy(language);
  const [copied, setCopied] =
    useState(false);

  async function copyLink() {
    try {
      if (
        navigator.clipboard &&
        window.isSecureContext
      ) {
        await navigator.clipboard.writeText(
          value
        );
      } else {
        const textarea =
          document.createElement(
            "textarea"
          );

        textarea.value = value;
        textarea.style.position =
          "fixed";
        textarea.style.opacity = "0";

        document.body.appendChild(
          textarea
        );

        textarea.focus();
        textarea.select();

        document.execCommand(
          "copy"
        );

        textarea.remove();
      }

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copyLink}
      className={
        className ??
        "rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800 transition hover:bg-slate-50"
      }
    >
      {copied
        ? (copiedLabel ?? copy.copied)
        : (label ?? copy.copyLink)}
    </button>
  );
}
