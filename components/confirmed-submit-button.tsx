"use client";

import type { MouseEvent } from "react";

type Props = {
  label: string;
  confirmMessage: string;
  className?: string;
};

export function ConfirmedSubmitButton({
  label,
  confirmMessage,
  className,
}: Props) {
  function confirmSubmit(event: MouseEvent<HTMLButtonElement>) {
    if (!window.confirm(confirmMessage)) event.preventDefault();
  }

  return (
    <button
      type="submit"
      onClick={confirmSubmit}
      className={className}
    >
      {label}
    </button>
  );
}