import Link from "next/link";
import BusinessSetupWizard from "@/components/business-setup-wizard";

type Language = "AR" | "EN";

type Props = {
  language: Language;
  createBusinessAction: (formData: FormData) => void | Promise<void>;
};

export function AddBusinessExperience({
  language,
  createBusinessAction,
}: Props) {
  const copy =
    language === "AR"
      ? {
          back: "العودة إلى الأنشطة التجارية",
          title: "إضافة نشاط تجاري",
          description: "أنشئ النشاط وحساب المالك واضبط إعدادات التشغيل مباشرة.",
        }
      : {
          back: "Back to businesses",
          title: "Add business",
          description: "Create the business and owner account, then configure operations directly.",
        };

  return (
    <main
      className="min-h-screen bg-surface-subtle px-4 py-8 sm:px-8"
      dir={language === "AR" ? "rtl" : "ltr"}
      data-add-business-language={language}
    >
      <div className="mx-auto max-w-7xl">
        <Link
          href="/businesses"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:text-primary-hover"
        >
          {language === "AR" ? "→" : "←"} {copy.back}
        </Link>
        <header className="mb-8 mt-4">
          <h1 className="lf-type-display text-foreground">{copy.title}</h1>
          <p className="mt-2 text-foreground-muted">{copy.description}</p>
        </header>

        <section className="w-full rounded-[var(--lf-radius-lg)] border border-border bg-surface p-5 shadow-[var(--lf-shadow-raised)] sm:p-8">
          <BusinessSetupWizard action={createBusinessAction} language={language} />
        </section>
      </div>
    </main>
  );
}
