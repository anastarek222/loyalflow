"use client";

import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { confirmation: string };

/** A clear UX confirmation only; server actions still own authorization and validation. */
export function ConfirmSubmitButton({ confirmation, onClick, ...props }: Props) {
  return <button {...props} onClick={(event) => { if (!window.confirm(confirmation)) { event.preventDefault(); return; } onClick?.(event); }} />;
}
