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
  AR: {
    label: "وضع الاستخدام",
    simple: "بسيط",
    simpleDescription: "للعمل اليومي السريع",
    advanced: "متقدم",
    advancedDescription: "التقارير والنمو والإدارة",
    updating: "جارٍ التحديث",
  },
  EN: {
    label: "Experience mode",
    simple: "Simple",
    simpleDescription: "Fast daily operations",
    advanced: "Advanced",
    advancedDescription: "Reports, growth and administration",
    updating: "Updating",
  },
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
          const description =
            candidate === "SIMPLE"
              ? copy.simpleDescription
              : copy.advancedDescription;
          return (
            <form key={candidate} action={(formData) => startTransition(() => updateExperienceModeAction(formData))}>
              <input type="hidden" name="experienceMode" value={candidate} />
              <button
                type="submit"
                aria-label={label}
                aria-pressed={selected}
                disabled={isPending}
                className={`min-h-16 w-full rounded-[var(--lf-radius-input)] border px-3 py-2 text-start transition-colors ${selected ? "border-primary bg-primary-subtle text-primary" : "border-border text-foreground-muted hover:bg-surface-subtle"}`}
              >
                <span className="flex items-center justify-between gap-2 text-sm font-bold">
                  <span>{label}</span>
                  <span aria-hidden="true">{selected ? "✓" : ""}</span>
                </span>
                <span className="mt-0.5 block text-xs font-medium opacity-80">
                  {description}
                </span>
              </button>
            </form>
          );
        })}
      </div>
      {isPending ? <p className="mt-2 text-xs text-foreground-subtle" role="status">{copy.updating}</p> : null}
    </fieldset>
  );
}
