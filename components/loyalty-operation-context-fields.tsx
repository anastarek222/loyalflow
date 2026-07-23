"use client";

type LoyaltyOperationContextFieldsProps = {
  branches: Array<{ id: string; name: string }>;
  staff: Array<{ id: string; firstName: string; lastName: string | null }>;
  branchRequired: boolean;
  staffAttributionEnabled: boolean;
  staffAttributionRequired: boolean;
  idPrefix: string;
  disabled?: boolean;
  language?: AppLanguage;
};

/** Compact, shared form controls for the canonical loyalty operation context. */
export default function LoyaltyOperationContextFields({
  branches,
  staff,
  branchRequired,
  staffAttributionEnabled,
  staffAttributionRequired,
  idPrefix,
  disabled = false,
  language = "AR",
}: LoyaltyOperationContextFieldsProps) {
  const copy = customerUiCopy(language);
  return (
    <>
      {branches.length > 0 ? (
        <div className="mb-3">
          <label className="mb-2 block text-sm font-bold text-slate-700" htmlFor={`${idPrefix}-branch`}>
            {copy.branch}
          </label>
          <select
            id={`${idPrefix}-branch`}
            name="branchId"
            required={branchRequired}
            disabled={disabled}
            defaultValue=""
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-violet-500 disabled:bg-slate-100"
          >
            <option value="">
              {branchRequired ? copy.selectBranch : copy.noBranch}
            </option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {staffAttributionEnabled ? (
        <div className="mb-3">
          <label className="mb-2 block text-sm font-bold text-slate-700" htmlFor={`${idPrefix}-staff`}>
            {copy.attributedStaff}
          </label>
          <select
            id={`${idPrefix}-staff`}
            name="attributedStaffId"
            required={staffAttributionRequired}
            disabled={disabled}
            defaultValue=""
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-violet-500 disabled:bg-slate-100"
          >
            <option value="">
              {staffAttributionRequired
                ? copy.selectStaff
                : copy.noStaff}
            </option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {[member.firstName, member.lastName].filter(Boolean).join(" ")}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </>
  );
}
import { customerUiCopy } from "@/lib/customers/ui-copy";
import type { AppLanguage } from "@/lib/i18n";
