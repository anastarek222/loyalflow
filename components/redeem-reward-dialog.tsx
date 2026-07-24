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
        className="w-full rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
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
            <p className="text-sm font-bold text-emerald-700">
              {copy.redeemConfirm}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700"
              >
                {copy.cancel}
              </button>

              <form action={action}>
                <input type="hidden" name="operationId" value={operationId} />
                {operationContextFields}
                <button
                  type="submit"
                  className="w-full rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700 sm:w-auto"
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
