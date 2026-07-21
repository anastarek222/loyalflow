"use client";

import { useState } from "react";

type CopyLinkButtonProps = {
  value: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
};

export default function CopyLinkButton({
  value,
  label = "نسخ الرابط",
  copiedLabel = "تم النسخ ✓",
  className,
}: CopyLinkButtonProps) {
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
        ? copiedLabel
        : label}
    </button>
  );
}
