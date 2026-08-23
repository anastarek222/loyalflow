"use client";

import { useState } from "react";
import Link from "next/link";
import BusinessSetupWizard from "@/components/business-setup-wizard";
import { OwnerInvitationForm } from "@/components/owner-invitation-form";

type Flow = "choose" | "custom" | "invite";
type Language = "AR" | "EN";

type Props = {
  language: Language;
  createBusinessAction: (formData: FormData) => void | Promise<void>;
  createOwnerInvitationAction: (formData: FormData) => void | Promise<void>;
};

export function AddBusinessExperience({
  language,
  createBusinessAction,
  createOwnerInvitationAction,
}: Props) {
  const [flow, setFlow] = useState<Flow>("choose");
  const copy =
    language === "AR"
      ? {
          back: "العودة إلى الأنشطة التجارية",
          title: "إضافة نشاط تجاري",
          description: "اختر الطريقة المناسبة لإعداد هذا النشاط.",
          custom: "إعداد مخصص",
          customDescription: "أنشئ النشاط واضبط تفاصيله بنفسك.",
          invite: "دعوة المالك",
          inviteDescription:
            "أرسل للمالك دعوة آمنة بالبريد ليُفعّل حسابه ويكمل الإعداد بنفسه.",
          changePath: "تغيير مسار الإعداد",
          inviteDetail:
            "يستلم المالك رابطًا آمنًا عبر البريد، ويختار كلمة المرور، ثم يكمل إعداد نشاطه.",
        }
      : {
          back: "Back to businesses",
          title: "Add business",
          description: "Choose how this business should be set up.",
          custom: "Custom setup",
          customDescription: "Create and configure the business yourself.",
          invite: "Owner invitation",
          inviteDescription:
            "Email the owner a secure invitation so they can activate their account and complete setup.",
          changePath: "Change setup path",
          inviteDetail:
            "The owner receives a secure email link, chooses their password, then completes their own business setup.",
        };

  return (
    <main
      className="min-h-screen bg-surface-subtle px-4 py-8 sm:px-8"
      dir={language === "AR" ? "rtl" : "ltr"}
      data-add-business-language={language}
    >
      <div className="mx-auto max-w-7xl">
        <Link
          href="/businesses"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:text-primary-hover"
        >
          {language === "AR" ? "→" : "←"} {copy.back}
        </Link>
        <header className="mb-8 mt-4">
          <h1 className="lf-type-display text-foreground">{copy.title}</h1>
          <p className="mt-2 text-foreground-muted">{copy.description}</p>
        </header>

        {flow === "choose" ? (
          <div className="grid max-w-4xl gap-5 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setFlow("custom")}
              className="rounded-[var(--lf-radius-lg)] border border-border bg-surface p-7 text-start shadow-[var(--lf-shadow-raised)] transition hover:border-primary/40 hover:shadow-[var(--lf-shadow-overlay)]"
            >
              <h2 className="text-xl font-bold text-foreground">{copy.custom}</h2>
              <p className="mt-2 text-sm text-foreground-muted">
                {copy.customDescription}
              </p>
            </button>
            <button
              type="button"
              onClick={() => setFlow("invite")}
              className="rounded-[var(--lf-radius-lg)] border border-border bg-surface p-7 text-start shadow-[var(--lf-shadow-raised)] transition hover:border-primary/40 hover:shadow-[var(--lf-shadow-overlay)]"
            >
              <h2 className="text-xl font-bold text-foreground">{copy.invite}</h2>
              <p className="mt-2 text-sm text-foreground-muted">
                {copy.inviteDescription}
              </p>
            </button>
          </div>
        ) : (
          <section className="w-full rounded-[var(--lf-radius-lg)] border border-border bg-surface p-5 shadow-[var(--lf-shadow-raised)] sm:p-8">
            <button
              type="button"
              onClick={() => setFlow("choose")}
              className="min-h-11 text-sm font-semibold text-primary hover:text-primary-hover"
            >
              {language === "AR" ? "→" : "←"} {copy.changePath}
            </button>
            {flow === "custom" ? (
              <BusinessSetupWizard
                action={createBusinessAction}
                language={language}
              />
            ) : (
              <div className="max-w-xl">
                <h2 className="mt-5 text-2xl font-bold text-foreground">
                  {copy.invite}
                </h2>
                <p className="mt-2 text-foreground-muted">{copy.inviteDetail}</p>
                <OwnerInvitationForm
                  action={createOwnerInvitationAction}
                  language={language}
                />
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
