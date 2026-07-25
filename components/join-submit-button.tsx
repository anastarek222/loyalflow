"use client";

import { useFormStatus } from "react-dom";

type JoinSubmitButtonProps = {
  label: string;
  pendingLabel: string;
  primaryColor: string;
};

export default function JoinSubmitButton({
  label,
  pendingLabel,
  primaryColor,
}: JoinSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="w-full rounded-[var(--lf-radius-input)] px-6 py-4.5 font-black text-white transition hover:brightness-95 focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-70"
      style={{ backgroundColor: primaryColor }}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
