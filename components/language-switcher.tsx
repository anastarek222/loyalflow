import {
  updateUserLanguageAction,
} from "@/app/language/actions";

import {
  getSharedDictionary,
  type AppLanguage,
} from "@/lib/i18n";

type LanguageSwitcherProps = {
  language: AppLanguage;
};

export default function LanguageSwitcher({
  language,
}: LanguageSwitcherProps) {
  const dictionary =
    getSharedDictionary(
      language
    );

  return (
    <div
      dir="ltr"
      aria-label={
        dictionary.language
      }
      className="rounded-md border border-border bg-surface p-1"
    >
      <div className="flex items-center gap-1">
        <form
          action={
            updateUserLanguageAction
          }
        >
          <input
            type="hidden"
            name="language"
            value="AR"
          />

          <button
            type="submit"
            aria-label={
              dictionary
                .switchToArabic
            }
            aria-pressed={
              language === "AR"
            }
            className={`rounded-xl px-3 py-2 text-xs font-black transition sm:px-4 sm:text-sm ${
              language === "AR"
                ? "bg-slate-950 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            العربية
          </button>
        </form>

        <form
          action={
            updateUserLanguageAction
          }
        >
          <input
            type="hidden"
            name="language"
            value="EN"
          />

          <button
            type="submit"
            aria-label={
              dictionary
                .switchToEnglish
            }
            aria-pressed={
              language === "EN"
            }
            className={`rounded-xl px-3 py-2 text-xs font-black transition sm:px-4 sm:text-sm ${
              language === "EN"
                ? "bg-slate-950 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            English
          </button>
        </form>
      </div>
    </div>
  );
}
