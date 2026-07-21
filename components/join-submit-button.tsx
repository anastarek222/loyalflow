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
      className="w-full rounded-xl px-5 py-3.5 font-black text-white transition hover:brightness-95 focus:outline-none focus:ring-4 focus:ring-violet-200 disabled:cursor-not-allowed disabled:opacity-70"
      style={{ backgroundColor: primaryColor }}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
