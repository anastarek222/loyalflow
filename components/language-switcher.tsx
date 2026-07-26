import { Languages } from "lucide-react";

import { updateUserLanguageAction } from "@/app/language/actions";
import { getSharedDictionary, type AppLanguage } from "@/lib/i18n";

type LanguageSwitcherProps = {
  language: AppLanguage;
};

export default function LanguageSwitcher({ language }: LanguageSwitcherProps) {
  const dictionary = getSharedDictionary(language);
  const nextLanguage = language === "AR" ? "EN" : "AR";
  const nextLabel = language === "AR" ? "EN" : "ع";

  return (
    <form action={updateUserLanguageAction}>
      <input type="hidden" name="language" value={nextLanguage} />
      <button
        type="submit"
        aria-label={
          nextLanguage === "AR"
            ? dictionary.switchToArabic
            : dictionary.switchToEnglish
        }
        title={dictionary.language}
        className="inline-flex min-h-10 items-center gap-2 rounded-[var(--lf-radius-input)] border border-border bg-surface px-3 text-sm font-semibold text-foreground-muted transition hover:border-primary/30 hover:bg-surface-subtle hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lf-focus)]"
      >
        <Languages size={16} aria-hidden="true" />
        <span dir="ltr">{nextLabel}</span>
      </button>
    </form>
  );
}
