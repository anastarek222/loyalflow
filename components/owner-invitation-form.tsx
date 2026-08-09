"use client";
import { useState } from "react";
import { ownerInvitationSchema } from "@/lib/business/creation-input";

export function OwnerInvitationForm({ action }: { action: (formData: FormData) => void | Promise<void> }) {
  const [error, setError] = useState("");
  return <form action={action} onSubmit={(event) => { const parsed = ownerInvitationSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget))); if (!parsed.success) { event.preventDefault(); const field = String(parsed.error.issues[0]?.path[0] ?? "details"); setError(`Please check ${field === "ownerEmail" ? "the owner email address" : "the owner details"}.`); } }} className="mt-5 space-y-4">
    {error ? <p role="alert" className="rounded-xl border border-danger/30 bg-danger-subtle p-3 text-sm text-danger">{error}</p> : null}
    <input name="ownerFirstName" required minLength={2} maxLength={80} placeholder="Owner first name" className="w-full rounded-xl border px-4 py-3" />
    <input name="ownerLastName" maxLength={80} placeholder="Owner last name (optional)" className="w-full rounded-xl border px-4 py-3" />
    <input name="ownerEmail" required type="email" maxLength={255} placeholder="Owner email" className="w-full rounded-xl border px-4 py-3" />
    <button type="submit" className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-white hover:bg-primary-hover">Send owner invitation</button>
  </form>;
}
