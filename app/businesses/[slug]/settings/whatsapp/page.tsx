import { auth } from "@/auth";
import { getLanguageLocale, normalizeLanguage } from "@/lib/i18n";
import { canManageBusiness } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { getBusinessWhatsAppCredential } from "@/lib/server/integrations/business-whatsapp-credentials";
import {
  getBusinessWhatsAppAutomaticReadiness,
  getBusinessWhatsAppTemplateBindings,
  hashBusinessWhatsAppTemplate,
} from "@/lib/server/integrations/business-whatsapp-template-bindings";
import { getWhatsAppProviderReadiness } from "@/lib/server/integrations/whatsapp-readiness";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  manageBusinessWhatsAppTemplateAction,
  updateBusinessWhatsAppConnectionAction,
} from "../whatsapp-actions";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ whatsapp?: string; whatsappTemplate?: string }>;
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
    select: {
      id: true,
      slug: true,
      name: true,
      cardDefaultLanguage: true,
      whatsappWelcomeMessage: true,
      whatsappBalanceMessage: true,
      whatsappRewardMessage: true,
    },
  });
  if (!business) notFound();
  if (!canManageBusiness(session.user, business.id)) redirect("/dashboard");

  const [currentUser, credential, bindings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { language: true },
    }),
    getBusinessWhatsAppCredential(prisma, business.id),
    getBusinessWhatsAppTemplateBindings(prisma, {
      businessId: business.id,
      language: business.cardDefaultLanguage,
    }),
  ]);
  const automaticTemplateReadiness = await getBusinessWhatsAppAutomaticReadiness(
    prisma,
    {
      businessId: business.id,
      wabaId: credential?.wabaId ?? null,
      language: business.cardDefaultLanguage,
      messages: {
        whatsappWelcomeMessage: business.whatsappWelcomeMessage,
        whatsappBalanceMessage: business.whatsappBalanceMessage,
        whatsappRewardMessage: business.whatsappRewardMessage,
      },
    },
  );

  const language = normalizeLanguage(currentUser?.language);
  const locale = getLanguageLocale(language);
  const t = (ar: string, en: string) => (language === "AR" ? ar : en);
  const providerReadiness = getWhatsAppProviderReadiness();
  const senderReady = Boolean(credential?.wabaId);
  const deliveryReady =
    providerReadiness.providerReady &&
    senderReady &&
    automaticTemplateReadiness.ready;
  const updateConnection = updateBusinessWhatsAppConnectionAction.bind(
    null,
    business.slug,
  );
  const manageTemplate = manageBusinessWhatsAppTemplateAction.bind(
    null,
    business.slug,
  );

  const statusMessage =
    query.whatsapp === "connected"
      ? t(
          "تم حفظ بيانات WhatsApp وWABA بأمان.",
          "WhatsApp sender and WABA details were saved securely.",
        )
      : query.whatsapp === "disconnected"
        ? t("تم فصل بيانات مرسل WhatsApp.", "WhatsApp sender credentials disconnected.")
        : query.whatsappTemplate === "approved"
          ? t("Meta تؤكد أن القالب معتمد.", "Meta confirms that the template is approved.")
          : query.whatsappTemplate === "pending"
            ? t("تم إرسال القالب إلى Meta وهو قيد المراجعة.", "The template is submitted to Meta and is pending review.")
            : query.whatsappTemplate === "rejected"
              ? t("Meta رفضت القالب الحالي. الإرسال التلقائي لهذا الحدث متوقف.", "Meta rejected the current template. Automatic delivery for this event is blocked.")
              : query.whatsappTemplate === "unknown"
                ? t("تمت مزامنة القالب لكن Meta أعادت حالة غير معروفة؛ الإرسال متوقف احتياطيًا.", "The template synced but Meta returned an unknown state; delivery remains fail-closed.")
                : null;
  const errorMessage =
    query.whatsapp === "invalid"
      ? t(
          "تحقق من WABA ID وPhone Number ID وAccess Token ثم حاول مرة أخرى.",
          "Check the WABA ID, Phone Number ID, and Access Token, then try again.",
        )
      : query.whatsapp === "subscription-restricted"
        ? t(
            "لا يمكن إضافة اتصال أو قالب جديد في حالة الاشتراك الحالية. ما زال بإمكانك فصل الاتصال أو تحديث حالة قالب موجود.",
            "A new connection or template cannot be added in the current subscription state. You can still disconnect or refresh an existing template state.",
          )
        : query.whatsappTemplate === "provider-error"
          ? t(
              "تعذر إكمال العملية مع Meta. لم يتم اعتماد أي حالة محليًا من عندنا.",
              "The Meta operation could not be completed. Tanee did not invent or locally approve a provider state.",
            )
          : query.whatsappTemplate === "invalid"
            ? t("طلب القالب غير صالح.", "The template request is invalid.")
            : null;

  const templateRows = [
    {
      event: "WELCOME" as const,
      title: t("Welcome", "Welcome"),
      message: business.whatsappWelcomeMessage,
    },
    {
      event: "BALANCE_UPDATED" as const,
      title: t("Balance Update", "Balance Update"),
      message: business.whatsappBalanceMessage,
    },
    {
      event: "REWARD_READY" as const,
      title: t("Reward", "Reward"),
      message: business.whatsappRewardMessage,
    },
  ];
  const bindingByEvent = new Map(bindings.map((binding) => [binding.event, binding]));

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
              "اربط WABA ورقم WhatsApp Cloud API الخاصين بهذا النشاط. رمز الوصول يُشفّر على الخادم ولا يتم عرضه مرة أخرى.",
              "Connect this business's WABA and WhatsApp Cloud API number. The access token is encrypted server-side and is never displayed again.",
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
                {deliveryReady
                  ? t("جاهز للإرسال التلقائي", "Ready for automatic delivery")
                  : credential
                    ? !credential.wabaId
                      ? t("بيانات قديمة · WABA ID مطلوب", "Legacy connection · WABA ID required")
                      : automaticTemplateReadiness.hasEnabledMessages
                        ? t(
                            "بيانات المرسل محفوظة · اعتماد القالب غير مكتمل",
                            "Sender credentials saved · template approval incomplete",
                          )
                        : t(
                            "بيانات المرسل محفوظة · لا توجد رسائل تلقائية مفعلة",
                            "Sender credentials saved · no automatic messages enabled",
                          )
                    : t("غير جاهز للإرسال", "Not ready for delivery")}
              </p>
              <p className="mt-1 text-xs text-foreground-muted">
                {credential
                  ? `${t("Phone Number ID", "Phone Number ID")}: ${credential.phoneNumberId}${credential.wabaId ? ` · WABA ID: ${credential.wabaId}` : ""}`
                  : t(
                      "احفظ بيانات مرسل خاصة بهذا النشاط لتفعيل الإرسال. لن يتم استخدام مرسل عام بدلًا منها.",
                      "Save sender credentials for this business to enable delivery. A server-wide sender will not be used as a fallback.",
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

          {!providerReadiness.providerReady ? (
            <div className="mt-5 rounded-xl border border-warning/30 bg-warning-subtle p-4 text-sm leading-6 text-foreground">
              <p className="font-black">
                {t(
                  "إعداد WhatsApp على الخادم غير مكتمل.",
                  "Server-side WhatsApp delivery configuration is incomplete.",
                )}
              </p>
              <p className="mt-1 text-foreground-muted">
                {t(
                  "لن تعمل الرسائل التلقائية حتى يتم ضبط إصدار Graph API. أسماء القوالب وحالة اعتمادها مرتبطة بكل نشاط وWABA ويتم التحقق منها من Meta والبيانات المحفوظة.",
                  "Automatic messages cannot be delivered until the Graph API version is configured. Template names and approval state are scoped to each business and WABA and verified from Meta and persisted provider state.",
                )}
              </p>
              <p className="mt-2 break-words font-mono text-xs text-foreground-muted">
                {providerReadiness.missingProviderConfig.join(", ")}
              </p>
            </div>
          ) : null}

          {providerReadiness.providerReady && senderReady && !automaticTemplateReadiness.ready ? (
            <div className="mt-5 rounded-xl border border-warning/30 bg-warning-subtle p-4 text-sm leading-6 text-foreground">
              <p className="font-black">
                {automaticTemplateReadiness.hasEnabledMessages
                  ? t(
                      "اعتماد رسائل WhatsApp التلقائية غير مكتمل.",
                      "Automatic WhatsApp template approval is incomplete.",
                    )
                  : t(
                      "لا توجد رسالة WhatsApp تلقائية مفعلة.",
                      "No automatic WhatsApp message is enabled.",
                    )}
              </p>
              <p className="mt-1 text-foreground-muted">
                {automaticTemplateReadiness.hasEnabledMessages
                  ? t(
                      "كل رسالة مفعلة تحتاج قالب Meta معتمدًا لنفس WABA واللغة ويطابق نفس نسخة النص المحفوظة حاليًا. تعديل النص أو تغيير WABA يوقف الإرسال حتى اعتماد النسخة الصحيحة.",
                      "Every enabled message needs an approved Meta template for the same WABA and language that matches the currently saved copy. Editing the copy or changing WABA pauses delivery until the correct version is approved.",
                    )
                  : t(
                      "أضف نصًا واحدًا على الأقل من رسائل Welcome أو Balance Update أو Reward لتفعيل الإرسال التلقائي. ترك الرسالة فارغة يعطل الحدث بشكل مقصود.",
                      "Add at least one Owner-authored Welcome, Balance Update, or Reward message to enable automatic delivery. Leaving a message blank intentionally disables that event.",
                    )}
              </p>
            </div>
          ) : null}

          {deliveryReady ? (
            <p className="mt-5 rounded-xl border border-success/30 bg-success-subtle p-4 text-sm font-semibold text-success">
              {t(
                "إصدار Graph API وWABA وبيانات مرسل النشاط واعتماد قوالب الرسائل المفعلة متطابقة مع النسخة الحالية. يظل نجاح التسليم الفعلي معتمدًا على قبول Meta للطلب.",
                "The Graph API version, WABA, this business's sender credentials, and approvals for all enabled message templates match the current copy. Actual delivery still depends on Meta accepting the request.",
              )}
            </p>
          ) : null}

          <form action={updateConnection} className="mt-6 grid gap-4">
            <input type="hidden" name="intent" value="connect" />
            <label className="text-sm font-bold text-foreground">
              WABA ID
              <input
                name="wabaId"
                inputMode="numeric"
                autoComplete="off"
                required
                defaultValue={credential?.wabaId ?? ""}
                className="mt-2 min-h-12 w-full rounded-xl border border-border px-4 py-3"
              />
            </label>
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
                "حفظ هذا النموذج يستبدل بيانات الاتصال السابقة. لا يتم تسجيل Access Token في سجلات النشاط أو إعادته إلى المتصفح.",
                "Saving this form replaces the previous connection details. The Access Token is not written to business logs or returned to the browser.",
              )}
            </p>
            <button
              type="submit"
              className="min-h-12 rounded-xl bg-primary px-4 py-3 font-bold text-white sm:w-fit"
            >
              {credential
                ? t("تحديث بيانات WhatsApp", "Update WhatsApp connection")
                : t("حفظ بيانات WhatsApp", "Save WhatsApp connection")}
            </button>
          </form>
        </section>

        <section className="mt-4 rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-foreground-subtle">
            {t("Meta Templates", "Meta Templates")}
          </p>
          <h2 className="mt-2 text-xl font-black text-foreground">
            {t("اعتماد الرسائل التلقائية", "Automatic message approval")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-foreground-muted">
            {t(
              `Tanee يرسل النص المحفوظ للـOwner إلى Meta تحت لغة البرنامج الحالية (${business.cardDefaultLanguage}). حالة الاعتماد أدناه تأتي من Meta وليست اختيارًا يدويًا داخل Tanee.`,
              `Tanee submits the Owner's saved copy to Meta under the current program language (${business.cardDefaultLanguage}). Approval state below comes from Meta and cannot be selected manually in Tanee.`,
            )}
          </p>

          <div className="mt-5 grid gap-3">
            {templateRows.map((row) => {
              const message = row.message?.trim() ?? "";
              const binding = bindingByEvent.get(row.event);
              const currentHash = message ? hashBusinessWhatsAppTemplate(message) : null;
              const bindingMatchesCurrent = Boolean(
                currentHash &&
                  credential?.wabaId &&
                  binding?.wabaId === credential.wabaId &&
                  binding.contentSha256 === currentHash,
              );
              const providerStatus = bindingMatchesCurrent
                ? binding?.approvalStatus ?? "NOT_SUBMITTED"
                : binding
                  ? "STALE"
                  : "NOT_SUBMITTED";

              return (
                <div key={row.event} className="rounded-xl border border-border p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-black text-foreground">{row.title}</p>
                      <p className="mt-1 text-xs text-foreground-muted">
                        {message
                          ? `${t("حالة Meta", "Meta status")}: ${providerStatus}`
                          : t("الرسالة فارغة؛ هذا الحدث معطل.", "Message is blank; this event is disabled.")}
                      </p>
                      {bindingMatchesCurrent && binding ? (
                        <p className="mt-1 break-all font-mono text-[11px] text-foreground-subtle">
                          {binding.templateName}
                        </p>
                      ) : null}
                    </div>

                    {message && credential?.wabaId && providerReadiness.providerReady ? (
                      <form action={manageTemplate} className="flex flex-wrap gap-2">
                        <input type="hidden" name="event" value={row.event} />
                        <button
                          type="submit"
                          name="intent"
                          value="submit-template"
                          className="min-h-10 rounded-xl bg-primary px-3 text-xs font-bold text-white"
                        >
                          {bindingMatchesCurrent
                            ? t("إعادة التحقق/الإرسال", "Reconcile/submit")
                            : t("إرسال النسخة الحالية", "Submit current copy")}
                        </button>
                        {bindingMatchesCurrent ? (
                          <button
                            type="submit"
                            name="intent"
                            value="refresh-template"
                            className="min-h-10 rounded-xl border border-border px-3 text-xs font-bold text-foreground"
                          >
                            {t("تحديث الحالة من Meta", "Refresh from Meta")}
                          </button>
                        ) : null}
                      </form>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
