import { WhatsAppEmbeddedSignupButton } from "@/components/whatsapp-embedded-signup-button";
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
import { getWhatsAppEmbeddedSignupReadiness } from "@/lib/server/integrations/whatsapp-embedded-signup";
import {
  getBusinessWhatsAppConnectionReadiness,
  getWhatsAppProviderReadiness,
} from "@/lib/server/integrations/whatsapp-readiness";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  completeBusinessWhatsAppEmbeddedSignupAction,
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
  const embeddedSignupReadiness = getWhatsAppEmbeddedSignupReadiness();
  const embeddedSignupAppId =
    process.env.NEXT_PUBLIC_WHATSAPP_META_APP_ID?.trim() ?? "";
  const embeddedSignupConfigId =
    process.env.NEXT_PUBLIC_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID?.trim() ?? "";
  const graphApiVersion = process.env.WHATSAPP_GRAPH_API_VERSION?.trim() ?? "";
  const senderReady = Boolean(
    credential?.wabaId?.trim() && credential.phoneNumberId.trim(),
  );
  const connectionReadiness = getBusinessWhatsAppConnectionReadiness({
    credentialPresent: Boolean(credential),
    senderReady,
    providerReady: providerReadiness.providerReady,
    hasEnabledMessages: automaticTemplateReadiness.hasEnabledMessages,
    templatesReady: automaticTemplateReadiness.ready,
  });
  const deliveryReady = connectionReadiness.automaticDeliveryReady;

  const updateConnection = updateBusinessWhatsAppConnectionAction.bind(
    null,
    business.slug,
  );
  const completeEmbeddedSignup =
    completeBusinessWhatsAppEmbeddedSignupAction.bind(null, business.slug);
  const manageTemplate = manageBusinessWhatsAppTemplateAction.bind(
    null,
    business.slug,
  );

  const statusMessage =
    query.whatsapp === "connected"
      ? t(
          "تم ربط WhatsApp بالنشاط بنجاح.",
          "WhatsApp was connected to this business successfully.",
        )
      : query.whatsapp === "disconnected"
        ? t("تم فصل WhatsApp عن النشاط.", "WhatsApp was disconnected from this business.")
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
          "راجع بيانات الإعداد المتقدم وحاول مرة أخرى.",
          "Review the advanced connection details and try again.",
        )
      : query.whatsapp === "embedded-invalid"
        ? t(
            "لم تكتمل بيانات الربط القادمة من Meta. حاول ربط WhatsApp مرة أخرى.",
            "Meta did not return a complete WhatsApp connection. Try connecting again.",
          )
        : query.whatsapp === "embedded-not-configured"
          ? t(
              "إعداد الربط الرسمي مع Meta ما زال قيد التجهيز.",
              "The official Meta connection setup is still being prepared.",
            )
          : query.whatsapp === "embedded-failed"
            ? t(
                "Meta لم تكمل الربط. لم يتم حفظ اتصال جزئي؛ حاول مرة أخرى.",
                "Meta did not complete the connection. No partial connection was saved; try again.",
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

  const connectionTitle =
    connectionReadiness.state === "READY"
      ? t("WhatsApp جاهز", "WhatsApp ready")
      : connectionReadiness.state === "NOT_CONNECTED"
        ? t("WhatsApp غير متصل", "WhatsApp not connected")
        : t("WhatsApp يحتاج إجراء", "WhatsApp action required");

  const connectionDescription =
    connectionReadiness.reason === "READY"
      ? t(
          "الاتصال والرسائل التلقائية المفعلة جاهزان.",
          "The connection and enabled automatic messages are ready.",
        )
      : connectionReadiness.reason === "NOT_CONNECTED"
        ? t(
            "اربط رقم النشاط عبر Meta لتبدأ إعداد رسائل الولاء على WhatsApp.",
            "Connect the business number through Meta to start setting up loyalty messages on WhatsApp.",
          )
        : connectionReadiness.reason === "SENDER_INCOMPLETE"
          ? t(
              "بيانات الاتصال المحفوظة غير مكتملة. أعد ربط WhatsApp أو استخدم الإعداد المتقدم للدعم.",
              "The saved connection is incomplete. Reconnect WhatsApp or use advanced setup with support.",
            )
          : connectionReadiness.reason === "PROVIDER_NOT_READY"
            ? t(
                "رقم النشاط متصل، لكن إعداد الإرسال لدى Tanee لم يكتمل بعد.",
                "The business number is connected, but Tanee's delivery setup is not ready yet.",
              )
            : connectionReadiness.reason === "NO_AUTOMATIC_MESSAGES"
              ? t(
                  "رقم النشاط متصل. أضف نصًا لرسالة تلقائية واحدة على الأقل لبدء اعتمادها.",
                  "The business number is connected. Add at least one automatic message before requesting approval.",
                )
              : t(
                  "رقم النشاط متصل، لكن رسالة تلقائية مفعلة واحدة على الأقل ما زالت تحتاج اعتماد Meta للنص الحالي.",
                  "The business number is connected, but at least one enabled automatic message still needs Meta approval for its current copy.",
                );

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
            {t("WhatsApp", "WhatsApp")}
          </h1>
          <p className="mt-2 text-sm leading-6 text-foreground-muted">
            {t(
              "اربط WhatsApp مرة واحدة. Tanee يتولى تفاصيل Meta التقنية ويحفظ بيانات الاتصال بأمان لهذا النشاط فقط.",
              "Connect WhatsApp once. Tanee handles the Meta connection details and stores the connection securely for this business only.",
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

        <section
          className="mt-4 rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6"
          data-whatsapp-simple-connection
          data-whatsapp-connection-state={connectionReadiness.state}
          data-whatsapp-connection-reason={connectionReadiness.reason}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-black text-foreground">{connectionTitle}</p>
              <p className="mt-1 max-w-xl text-sm leading-6 text-foreground-muted">
                {connectionDescription}
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
                  {t("فصل WhatsApp", "Disconnect WhatsApp")}
                </button>
              </form>
            ) : null}
          </div>

          {!credential ? (
            <div className="mt-5">
              <WhatsAppEmbeddedSignupButton
                language={language}
                appId={embeddedSignupAppId}
                configId={embeddedSignupConfigId}
                graphApiVersion={graphApiVersion}
                enabled={embeddedSignupReadiness.ready}
                action={completeEmbeddedSignup}
              />
              {!embeddedSignupReadiness.ready ? (
                <p className="mt-3 text-xs leading-5 text-foreground-muted">
                  {t(
                    "زر الربط الرسمي موجود في Tanee، ويبدأ العمل بمجرد اكتمال إعداد تطبيق Meta الخاص بـTanee.",
                    "The official connection flow is built into Tanee and becomes available as soon as Tanee's Meta app setup is completed.",
                  )}
                </p>
              ) : null}
            </div>
          ) : null}

          {!providerReadiness.providerReady ? (
            <div className="mt-5 rounded-xl border border-warning/30 bg-warning-subtle p-4 text-sm leading-6 text-foreground">
              <p className="font-black">
                {t(
                  "الإرسال التلقائي ما زال قيد التجهيز.",
                  "Automatic delivery is still being prepared.",
                )}
              </p>
              <p className="mt-1 text-foreground-muted">
                {t(
                  "اتصال WhatsApp وإرسال الرسائل مرحلتان منفصلتان. Tanee لن يقول إن الإرسال جاهز قبل اكتمال إعداد Meta واعتماد الرسائل المطلوبة.",
                  "Connecting WhatsApp and enabling automatic delivery are separate steps. Tanee will not report delivery as ready until Meta setup and required message approvals are complete.",
                )}
              </p>
            </div>
          ) : null}

          {providerReadiness.providerReady && senderReady && !automaticTemplateReadiness.ready ? (
            <div className="mt-5 rounded-xl border border-warning/30 bg-warning-subtle p-4 text-sm leading-6 text-foreground">
              <p className="font-black">
                {automaticTemplateReadiness.hasEnabledMessages
                  ? t(
                      "اعتماد رسائل WhatsApp غير مكتمل.",
                      "WhatsApp message approval is incomplete.",
                    )
                  : t(
                      "لا توجد رسالة WhatsApp تلقائية مفعلة.",
                      "No automatic WhatsApp message is enabled.",
                    )}
              </p>
              <p className="mt-1 text-foreground-muted">
                {automaticTemplateReadiness.hasEnabledMessages
                  ? t(
                      "كل رسالة مفعلة تحتاج اعتماد Meta لنفس النص الحالي قبل الإرسال التلقائي.",
                      "Each enabled message needs Meta approval for the current saved copy before automatic delivery.",
                    )
                  : t(
                      "أضف نصًا واحدًا على الأقل من Welcome أو Balance Update أو Reward. ترك الرسالة فارغة يعطل تلك الحالة فقط.",
                      "Add at least one Welcome, Balance Update, or Reward message. Leaving a message blank disables only that case.",
                    )}
              </p>
            </div>
          ) : null}

          {deliveryReady ? (
            <p className="mt-5 rounded-xl border border-success/30 bg-success-subtle p-4 text-sm font-semibold text-success">
              {t(
                "WhatsApp جاهز للإرسال التلقائي للحالات المفعلة.",
                "WhatsApp is ready for automatic delivery for the enabled cases.",
              )}
            </p>
          ) : null}

          <details className="mt-6 rounded-xl border border-border bg-surface-subtle p-4" data-whatsapp-advanced-setup>
            <summary className="cursor-pointer text-sm font-bold text-foreground">
              {t("إعداد متقدم", "Advanced setup")}
            </summary>
            <p className="mt-2 text-xs leading-5 text-foreground-muted">
              {t(
                "استخدم هذه الحقول فقط للدعم أو الإعداد اليدوي المتقدم. المسار الطبيعي هو Connect WhatsApp أعلاه.",
                "Use these fields only for support or advanced manual setup. The normal path is Connect WhatsApp above.",
              )}
            </p>
            <form action={updateConnection} className="mt-4 grid gap-4">
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
                  "رمز الوصول يُشفّر على الخادم ولا يتم عرضه مرة أخرى.",
                  "The access token is encrypted server-side and is never displayed again.",
                )}
              </p>
              <button
                type="submit"
                className="min-h-12 rounded-xl border border-border bg-surface px-4 py-3 font-bold text-foreground sm:w-fit"
              >
                {credential
                  ? t("تحديث الإعداد المتقدم", "Update advanced setup")
                  : t("حفظ الإعداد المتقدم", "Save advanced setup")}
              </button>
            </form>
          </details>
        </section>

        <section className="mt-4 rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-foreground-subtle">
            {t("Meta Templates", "Meta Templates")}
          </p>
          <h2 className="mt-2 text-xl font-black text-foreground">
            {t("اعتماد رسائل WhatsApp", "WhatsApp message approval")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-foreground-muted">
            {t(
              `Tanee يرسل نفس النص الذي كتبه الـOwner إلى Meta تحت لغة البرنامج الحالية (${business.cardDefaultLanguage}). حالة الاعتماد تأتي من Meta وليست اختيارًا يدويًا داخل Tanee.`,
              `Tanee submits the same Owner-authored copy to Meta under the current program language (${business.cardDefaultLanguage}). Approval state comes from Meta and cannot be selected manually in Tanee.`,
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
                          : t("الرسالة فارغة؛ هذه الحالة معطلة.", "Message is blank; this case is disabled.")}
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
