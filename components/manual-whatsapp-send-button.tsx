"use client";

import { useState } from "react";

export function ManualWhatsAppSendButton({
  action,
  event,
  requestId,
  label,
  customerName,
  maskedPhone,
  preview,
  language,
  tone = "primary",
}: {
  action: (formData: FormData) => void | Promise<void>;
  event: string;
  requestId: string;
  label: string;
  customerName: string;
  maskedPhone: string;
  preview: string;
  language: "AR" | "EN";
  tone?: "primary" | "success" | "warning";
}) {
  const [open, setOpen] = useState(false);
  const t = (ar: string, en: string) => (language === "AR" ? ar : en);
  const toneClass =
    tone === "success"
      ? "bg-success text-white"
      : tone === "warning"
        ? "bg-warning-subtle text-foreground"
        : "bg-primary text-white";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`rounded-[var(--lf-radius-input)] px-4 py-2 text-sm font-bold ${toneClass}`}
      >
        {label}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="presentation">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={`whatsapp-preview-${requestId}`}
            className="w-full max-w-lg rounded-[var(--lf-radius-card)] border border-border bg-white p-5 shadow-xl"
          >
            <h3 id={`whatsapp-preview-${requestId}`} className="text-lg font-black text-foreground">
              {t(`إرسال رسالة إلى ${customerName}`, `Send message to ${customerName}`)}
            </h3>
            <p className="mt-1 text-sm text-foreground-muted" dir="ltr">
              {maskedPhone}
            </p>
            <p className="mt-4 whitespace-pre-wrap rounded-xl bg-surface-subtle p-4 text-sm leading-6 text-foreground" dir="auto">
              {preview}
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-xl border border-border px-4 text-sm font-bold">
                {t("إلغاء", "Cancel")}
              </button>
              <form action={action}>
                <input type="hidden" name="event" value={event} />
                <input type="hidden" name="requestId" value={requestId} />
                <button type="submit" className="min-h-11 rounded-xl bg-success px-4 text-sm font-bold text-white">
                  {t("إرسال الآن", "Send now")}
                </button>
              </form>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
