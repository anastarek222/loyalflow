"use client";

import { useEffect, useState } from "react";
import type { SupportedLocale } from "@/lib/i18n/config";

export function OwnerWhatsAppOnboarding({
  locale,
  launchAction,
}: {
  locale: SupportedLocale;
  launchAction: (formData: FormData) => Promise<void>;
}) {
  const [visible, setVisible] = useState(false);
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [error, setError] = useState("");
  const isArabic = locale === "ar";

  useEffect(() => {
    const form = document.querySelector<HTMLFormElement>("form[data-owner-step]");
    if (!form) return;

    const sync = () => setVisible(form.dataset.ownerStep === "6");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(form, { attributes: true, attributeFilter: ["data-owner-step"] });
    return () => observer.disconnect();
  }, []);

  if (!visible) return null;

  return (
    <section className="mx-auto mt-4 max-w-6xl rounded-3xl border border-border/80 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-primary">
        {isArabic ? "اختياري" : "Optional"}
      </p>
      <h2 className="mt-2 text-lg font-black text-foreground">
        {isArabic ? "اربط WhatsApp قبل الإطلاق" : "Connect WhatsApp before launch"}
      </h2>
      <p className="mt-1 text-sm leading-6 text-foreground-muted">
        {isArabic
          ? "بيانات الاتصال دي لا تدخل Save progress. يتم إرسالها فقط عند الضغط على زر الإطلاق بالاتصال، ثم يُشفّر Access Token على الخادم ويرتبط بالنشاط الجديد."
          : "These connection details are excluded from Save progress. They are sent only when you launch with WhatsApp, then the Access Token is encrypted server-side and attached to the new business."}
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold text-foreground">
          Phone Number ID
          <input
            value={phoneNumberId}
            onChange={(event) => setPhoneNumberId(event.target.value)}
            inputMode="numeric"
            autoComplete="off"
            className="mt-2 min-h-12 w-full rounded-xl border border-border px-4 py-3"
          />
        </label>
        <label className="text-sm font-bold text-foreground">
          Access Token
          <input
            value={accessToken}
            onChange={(event) => setAccessToken(event.target.value)}
            type="password"
            autoComplete="new-password"
            className="mt-2 min-h-12 w-full rounded-xl border border-border px-4 py-3"
          />
        </label>
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-sm font-semibold text-danger">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={async () => {
          const form = document.querySelector<HTMLFormElement>("form[data-owner-step]");
          const normalizedPhoneNumberId = phoneNumberId.trim();
          const normalizedAccessToken = accessToken.trim();
          if (!form || !normalizedPhoneNumberId || !normalizedAccessToken) {
            setError(
              isArabic
                ? "أدخل Phone Number ID وAccess Token معًا."
                : "Enter both Phone Number ID and Access Token.",
            );
            return;
          }
          setError("");
          const formData = new FormData(form);
          formData.set("whatsappPhoneNumberId", normalizedPhoneNumberId);
          formData.set("whatsappAccessToken", normalizedAccessToken);
          await launchAction(formData);
        }}
        className="mt-4 min-h-12 w-full rounded-xl bg-primary px-4 py-3 font-bold text-white sm:w-auto"
      >
        {isArabic ? "إطلاق النشاط وربط WhatsApp" : "Launch business & connect WhatsApp"}
      </button>
    </section>
  );
}
