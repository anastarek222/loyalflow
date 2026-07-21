"use client";

import { useState } from "react";

type CopyLinkButtonProps = {
  value: string;
  label?: string;
};

export default function CopyLinkButton({
  value,
  label = "نسخ رابط الكارت",
}: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(value);
    setCopied(true);

    window.setTimeout(() => {
      setCopied(false);
    }, 2000);
  }

  return (
    <button
      type="button"
      onClick={copyLink}
      className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800 transition hover:bg-slate-50"
    >
      {copied ? "تم النسخ ✓" : label}
    </button>
  );
}
