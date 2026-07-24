"use client";

import { useTransition } from "react";

import { updateExperienceModeAction } from "@/app/experience-mode/actions";
import type { ExperienceAccess, ExperienceMode } from "@/lib/experience-mode";

type Props = {
  language: "AR" | "EN";
  mode: ExperienceMode;
  access: ExperienceAccess;
};

const labels = {
  AR: { label: "وضع الاستخدام", simple: "بسيط", advanced: "متقدم", updating: "جارٍ التحديث" },
  EN: { label: "Experience mode", simple: "Simple", advanced: "Advanced", updating: "Updating" },
} as const;

export default function ExperienceModeSwitcher({ language, mode, access }: Props) {
  const [isPending, startTransition] = useTransition();
  const copy = labels[language];
  if (access !== "BOTH") return null;

  return (
    <fieldset id="experience-mode" aria-label={copy.label} className="border-b border-border px-3 py-3">
      <legend className="px-0 text-xs font-semibold text-slate-500">{copy.label}</legend>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {(["SIMPLE", "ADVANCED"] as const).map((candidate) => {
          const selected = candidate === mode;
          const label = candidate === "SIMPLE" ? copy.simple : copy.advanced;
          return (
            <form key={candidate} action={(formData) => startTransition(() => updateExperienceModeAction(formData))}>
              <input type="hidden" name="experienceMode" value={candidate} />
              <button
                type="submit"
                aria-pressed={selected}
                disabled={isPending}
                className={`flex min-h-11 w-full items-center justify-between rounded-md border px-3 text-sm font-semibold transition-colors ${selected ? "border-primary bg-indigo-50 text-primary" : "border-border text-slate-700 hover:bg-surface-subtle"}`}
              >
                <span>{label}</span>
                <span aria-hidden="true">{selected ? "✓" : ""}</span>
              </button>
            </form>
          );
        })}
      </div>
      {isPending ? <p className="mt-2 text-xs text-slate-500" role="status">{copy.updating}</p> : null}
    </fieldset>
  );
}
