"use client";

import { useEffect, useState } from "react";
import { WhatsAppEmbeddedSignupButton } from "@/components/whatsapp-embedded-signup-button";
import type { SupportedLocale } from "@/lib/i18n/config";

export function OwnerWhatsAppOnboarding({
  locale,
  launchAction,
  appId,
  configId,
  graphApiVersion,
  embeddedSignupReady,
}: {
  locale: SupportedLocale;
  launchAction: (formData: FormData) => Promise<void>;
  appId: string;
  configId: string;
  graphApiVersion: string;
  embeddedSignupReady: boolean;
}) {
  const [visible, setVisible] = useState(false);
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
      <p className="mt-1 max-w-3xl text-sm leading-6 text-foreground-muted">
        {isArabic
          ? "اضغط ربط WhatsApp وأكمل خطوات Meta الرسمية. Tanee لا يطلب منك Access Token أو Phone Number ID، والرمز السري الناتج من Meta يبقى على الخادم فقط ويرتبط بالنشاط الجديد. لو مش عايز تربطه دلوقتي، استخدم زر الإطلاق العادي بالأعلى وكمل الربط لاحقًا من Settings."
          : "Press Connect WhatsApp and complete Meta's official flow. Tanee does not ask you for an Access Token or Phone Number ID; the token returned by Meta stays server-side and is attached only to the new business. To skip this for now, use the normal launch button above and connect later from Settings."}
      </p>

      <div className="mt-4">
        <WhatsAppEmbeddedSignupButton
          language={isArabic ? "AR" : "EN"}
          appId={appId}
          configId={configId}
          graphApiVersion={graphApiVersion}
          enabled={embeddedSignupReady}
          action={launchAction}
          getActionFormData={() => {
            const form = document.querySelector<HTMLFormElement>("form[data-owner-step]");
            return form ? new FormData(form) : new FormData();
          }}
        />
        {!embeddedSignupReady ? (
          <p className="mt-3 text-xs leading-5 text-foreground-muted">
            {isArabic
              ? "تقدر تطلق النشاط دلوقتي وتربط WhatsApp لاحقًا من Settings بمجرد اكتمال إعداد Meta."
              : "You can launch the business now and connect WhatsApp later from Settings as soon as the Meta setup is ready."}
          </p>
        ) : null}
      </div>
    </section>
  );
}
