"use client";

import { useFormStatus } from "react-dom";

type ScanActionButtonProps = {
  children: React.ReactNode;
};

export default function ScanActionButton({
  children,
}: ScanActionButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-slate-950 px-5 py-4 font-black text-white transition disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "جارٍ التنفيذ..." : children}
    </button>
  );
}
