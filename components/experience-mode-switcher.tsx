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
    <fieldset id="experience-mode" aria-label={copy.label} className="border-b border-border px-4 py-4">
      <legend className="px-0 text-xs font-semibold text-foreground-subtle">{copy.label}</legend>
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
                className={`flex min-h-11 w-full items-center justify-between rounded-[var(--lf-radius-input)] border px-4 text-sm font-semibold transition-colors ${selected ? "border-primary bg-primary-subtle text-primary" : "border-border text-foreground-muted hover:bg-surface-subtle"}`}
              >
                <span>{label}</span>
                <span aria-hidden="true">{selected ? "✓" : ""}</span>
              </button>
            </form>
          );
        })}
      </div>
      {isPending ? <p className="mt-2 text-xs text-foreground-subtle" role="status">{copy.updating}</p> : null}
    </fieldset>
  );
}
