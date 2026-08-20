"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { ownerInvitationSchema } from "@/lib/business/creation-input";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  language: "AR" | "EN";
};

function OwnerInvitationSubmitButton({
  label,
  pendingLabel,
}: Readonly<{
  label: string;
  pendingLabel: string;
}>) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      data-owner-invitation-submit="true"
      className="w-full rounded-[var(--lf-radius-md)] bg-primary px-4 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

export function OwnerInvitationForm({ action, language }: Props) {
  const [error, setError] = useState("");
  const copy =
    language === "AR"
      ? {
          firstName: "الاسم الأول للمالك",
          lastName: "اسم العائلة للمالك (اختياري)",
          email: "بريد المالك الإلكتروني",
          submit: "إرسال دعوة المالك",
          submitting: "جارٍ إرسال دعوة المالك...",
          invalidEmail: "راجع بريد المالك الإلكتروني.",
          invalidDetails: "راجع بيانات المالك.",
        }
      : {
          firstName: "Owner first name",
          lastName: "Owner last name (optional)",
          email: "Owner email",
          submit: "Send owner invitation",
          submitting: "Sending owner invitation...",
          invalidEmail: "Please check the owner email address.",
          invalidDetails: "Please check the owner details.",
        };

  return (
    <form
      action={action}
      onSubmit={(event) => {
        const parsed = ownerInvitationSchema.safeParse(
          Object.fromEntries(new FormData(event.currentTarget)),
        );
        if (!parsed.success) {
          event.preventDefault();
          const field = String(parsed.error.issues[0]?.path[0] ?? "details");
          setError(
            field === "ownerEmail" ? copy.invalidEmail : copy.invalidDetails,
          );
          return;
        }

        setError("");
      }}
      className="mt-5 space-y-4"
    >
      {error ? (
        <p
          role="alert"
          className="rounded-[var(--lf-radius-md)] border border-danger/30 bg-danger-subtle p-3 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}
      <input
        name="ownerFirstName"
        required
        minLength={2}
        maxLength={80}
        placeholder={copy.firstName}
        className="w-full rounded-[var(--lf-radius-md)] border border-border bg-surface px-4 py-3"
      />
      <input
        name="ownerLastName"
        maxLength={80}
        placeholder={copy.lastName}
        className="w-full rounded-[var(--lf-radius-md)] border border-border bg-surface px-4 py-3"
      />
      <input
        name="ownerEmail"
        required
        type="email"
        maxLength={255}
        placeholder={copy.email}
        className="w-full rounded-[var(--lf-radius-md)] border border-border bg-surface px-4 py-3"
      />
      <OwnerInvitationSubmitButton
        label={copy.submit}
        pendingLabel={copy.submitting}
      />
    </form>
  );
}
