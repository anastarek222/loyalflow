import type { AppLanguage } from "@/lib/i18n";

const logoutEverywhereCopy = {
  AR: {
    sectionTitle: "تسجيل الخروج من جميع الأجهزة",
    sectionDescription:
      "استخدم هذا الخيار إذا فقدت جهازًا أو تريد إنهاء جميع جلساتك الحالية.",
    warning:
      "سيتم تسجيل خروجك من جميع الأجهزة، بما في ذلك هذا الجهاز، وستحتاج إلى تسجيل الدخول من جديد.",
    confirmation:
      "سيتم تسجيل خروجك من جميع الأجهزة، بما في ذلك هذا الجهاز، وستحتاج إلى تسجيل الدخول من جديد. هل تريد المتابعة؟",
    submit: "تسجيل الخروج من جميع الأجهزة",
    submitting: "جارٍ تسجيل الخروج…",
    failed:
      "تعذر تسجيل الخروج من جميع الأجهزة بأمان. أعد تحميل الصفحة وحاول مرة أخرى.",
  },
  EN: {
    sectionTitle: "Log out everywhere",
    sectionDescription:
      "Use this option if you lost a device or want to end all of your current sessions.",
    warning:
      "You will be signed out on every device, including this device, and you will need to sign in again.",
    confirmation:
      "You will be signed out on every device, including this device, and you will need to sign in again. Continue?",
    submit: "Log out everywhere",
    submitting: "Logging out…",
    failed:
      "We could not safely log you out everywhere. Reload the page and try again.",
  },
} satisfies Record<AppLanguage, Record<string, string>>;

export function getLogoutEverywhereCopy(language: AppLanguage) {
  return logoutEverywhereCopy[language];
}
