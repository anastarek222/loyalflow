import { auth } from "@/auth";
import { canManageBusiness } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { getLanguageLocale, normalizeLanguage } from "@/lib/i18n";
import { getBusinessWhatsAppCredential } from "@/lib/server/integrations/business-whatsapp-credentials";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { updateBusinessWhatsAppConnectionAction } from "../whatsapp-actions";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ whatsapp?: string }>;
};

export default async function BusinessWhatsAppSettingsPage({
  params,
  searchParams,
}: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { slug } = await params;
  const query = await searchParams;
  const business = await prisma.business.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true },
  });
  if (!business) notFound();
  if (!canManageBusiness(session.user, business.id)) redirect("/dashboard");

  const [currentUser, credential] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { language: true },
    }),
    getBusinessWhatsAppCredential(prisma, business.id),
  ]);
  const language = normalizeLanguage(currentUser?.language);
  const locale = getLanguageLocale(language);
  const t = (ar: string, en: string) => (language === "AR" ? ar : en);
  const updateConnection = updateBusinessWhatsAppConnectionAction.bind(
    null,
    business.slug,
  );

  const statusMessage =
    query.whatsapp === "connected"
      ? t("تم حفظ اتصال WhatsApp بأمان.", "WhatsApp connection saved securely.")
      : query.whatsapp === "disconnected"
        ? t("تم فصل اتصال WhatsApp.", "WhatsApp connection disconnected.")
        : null;
  const errorMessage =
    query.whatsapp === "invalid"
      ? t(
          "تحقق من Phone Number ID وAccess Token ثم حاول مرة أخرى.",
          "Check the Phone Number ID and Access Token, then try again.",
        )
      : query.whatsapp === "subscription-restricted"
        ? t(
            "لا يمكن إضافة اتصال جديد في حالة الاشتراك الحالية. ما زال بإمكانك فصل الاتصال الحالي.",
            "A new connection cannot be added in the current subscription state. You can still disconnect the existing connection.",
          )
        : null;

  return (
    <main
      className="min-h-screen px-4 py-6 sm:px-6 sm:py-8"
      dir={language === "AR" ? "rtl" : "ltr"}
      lang={locale}
    >
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/businesses/${business.slug}/settings`}
          className="text-sm font-semibold text-primary hover:underline"
        >
          {t("الرجوع إلى إعدادات النشاط", "Back to business settings")}
        </Link>

        <header className="mt-4 rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-foreground-subtle">
            {t("التكاملات", "Integrations")}
          </p>
          <h1 className="mt-2 text-2xl font-black text-foreground">
            {t("اتصال WhatsApp", "WhatsApp connection")}
          </h1>
          <p className="mt-2 text-sm leading-6 text-foreground-muted">
            {t(
              "اربط رقم WhatsApp Cloud API الخاص بهذا النشاط. رمز الوصول يُشفّر على الخادم ولا يتم عرضه مرة أخرى.",
              "Connect this business's WhatsApp Cloud API number. The access token is encrypted server-side and is never displayed again.",
            )}
          </p>
        </header>

        {statusMessage ? (
          <p className="mt-4 rounded-[var(--lf-radius-input)] border border-success/30 bg-success-subtle p-4 text-sm font-semibold text-success">
            {statusMessage}
          </p>
        ) : null}
        {errorMessage ? (
          <p className="mt-4 rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle p-4 text-sm font-semibold text-danger">
            {errorMessage}
          </p>
        ) : null}

        <section className="mt-4 rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black text-foreground">
                {credential
                  ? t("متصل", "Connected")
                  : t("غير متصل", "Not connected")}
              </p>
              <p className="mt-1 text-xs text-foreground-muted">
                {credential
                  ? `${t("Phone Number ID", "Phone Number ID")}: ${credential.phoneNumberId}`
                  : t(
                      "يمكنك استخدام الإعداد العام الحالي حتى تضيف اتصالًا خاصًا بالنشاط.",
                      "The existing global configuration remains available until you add a business-specific connection.",
                    )}
              </p>
            </div>
            {credential ? (
              <form action={updateConnection}>
                <button
                  type="submit"
                  name="intent"
                  value="disconnect"
                  className="min-h-10 rounded-xl border border-danger/30 px-4 text-sm font-bold text-danger"
                >
                  {t("فصل الاتصال", "Disconnect")}
                </button>
              </form>
            ) : null}
          </div>

          <form action={updateConnection} className="mt-6 grid gap-4">
            <input type="hidden" name="intent" value="connect" />
            <label className="text-sm font-bold text-foreground">
              Phone Number ID
              <input
                name="phoneNumberId"
                inputMode="numeric"
                autoComplete="off"
                required
                defaultValue={credential?.phoneNumberId ?? ""}
                className="mt-2 min-h-12 w-full rounded-xl border border-border px-4 py-3"
              />
            </label>
            <label className="text-sm font-bold text-foreground">
              Access Token
              <input
                name="accessToken"
                type="password"
                autoComplete="new-password"
                required
                placeholder={t(
                  "أدخل رمزًا جديدًا؛ لا يتم إظهار الرمز المحفوظ.",
                  "Enter a new token; the saved token is never revealed.",
                )}
                className="mt-2 min-h-12 w-full rounded-xl border border-border px-4 py-3"
              />
            </label>
            <p className="text-xs leading-5 text-foreground-muted">
              {t(
                "حفظ هذا النموذج يستبدل الرمز السابق بالكامل. لا يتم تسجيل الرمز في سجلات النشاط أو إعادته إلى المتصفح.",
                "Saving this form fully replaces the previous token. The token is not written to business logs or returned to the browser.",
              )}
            </p>
            <button
              type="submit"
              className="min-h-12 rounded-xl bg-primary px-4 py-3 font-bold text-white sm:w-fit"
            >
              {credential
                ? t("تحديث الاتصال", "Update connection")
                : t("حفظ الاتصال", "Save connection")}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
