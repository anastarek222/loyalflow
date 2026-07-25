"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { customerUiCopy } from "@/lib/customers/ui-copy";
import type { AppLanguage } from "@/lib/i18n";
import { Dialog } from "@/components/ui/dialog";

type RedeemRewardDialogProps = {
  action: () => void | Promise<void>;
  disabled: boolean;
  rewardName: string;
  cost: number;
  unitName: string;
  operationId: string;
  operationContextFields: ReactNode;
  language?: AppLanguage;
};

export default function RedeemRewardDialog({
  action,
  disabled,
  rewardName,
  cost,
  unitName,
  operationId,
  operationContextFields,
  language = "AR",
}: RedeemRewardDialogProps) {
  const copy = customerUiCopy(language);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(true)}
        className="w-full rounded-[var(--lf-radius-input)] bg-success px-6 py-4 font-semibold text-[var(--lf-inverse)] transition hover:bg-success-subtle disabled:cursor-not-allowed disabled:bg-surface-subtle"
      >
        {copy.redeemReward}
      </button>

      {isOpen && (
        <Dialog
          open={isOpen}
          onClose={() => setIsOpen(false)}
          title={rewardName}
          description={copy.redeemDescription(cost, unitName)}
          className="max-w-md"
        >
            <p className="text-sm font-bold text-success">
              {copy.redeemConfirm}
            </p>
            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-[var(--lf-radius-input)] border border-border px-6 py-4 font-semibold text-foreground-muted"
              >
                {copy.cancel}
              </button>

              <form action={action}>
                <input type="hidden" name="operationId" value={operationId} />
                {operationContextFields}
                <button
                  type="submit"
                  className="w-full rounded-[var(--lf-radius-input)] bg-success px-6 py-4 font-semibold text-[var(--lf-inverse)] transition hover:bg-success-subtle sm:w-auto"
                >
                  {copy.confirmRedeem}
                </button>
              </form>
            </div>
        </Dialog>
      )}
    </>
  );
}
