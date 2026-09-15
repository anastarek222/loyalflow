import { WhatsAppEmbeddedSignupButton } from "@/components/whatsapp-embedded-signup-button";
import { auth } from "@/auth";
import { getLanguageLocale, normalizeLanguage } from "@/lib/i18n";
import { canManageBusiness } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { getBusinessWhatsAppCredential } from "@/lib/server/integrations/business-whatsapp-credentials";
import { getBusinessWhatsAppAutomationSettings } from "@/lib/server/integrations/business-whatsapp-automation-settings";
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
  updateBusinessWhatsAppAutomationAction,
  updateBusinessWhatsAppConnectionAction,
} from "../whatsapp-actions";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    whatsapp?: string;
    whatsappTemplate?: string;
    whatsappAutomation?: string;
  }>;
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
      whatsappRedeemedMessage: true,
    },
  });
  if (!business) notFound();
  if (!canManageBusiness(session.user, business.id)) redirect("/dashboard");

  const [currentUser, credential, bindings, automation] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { language: true },
    }),
    getBusinessWhatsAppCredential(prisma, business.id),
    getBusinessWhatsAppTemplateBindings(prisma, {
      businessId: business.id,
      language: business.cardDefaultLanguage,
    }),
    getBusinessWhatsAppAutomationSettings(prisma, business.id),
  ]);
  if (!automation) notFound();

  const language = normalizeLanguage(currentUser?.language);
  const locale = getLanguageLocale(language);
  const t = (ar: string, en: string) => (language === "AR" ? ar : en);
  const isSuperAdmin = session.user.role === "SUPER_ADMIN";

  const messages = {
    whatsappWelcomeMessage: business.whatsappWelcomeMessage,
    whatsappBalanceMessage: business.whatsappBalanceMessage,
    whatsappRewardMessage: business.whatsappRewardMessage,
    whatsappRedeemedMessage: business.whatsappRedeemedMessage,
    newRewardMessage: automation.newRewardMessage,
    newOfferMessage: automation.newOfferMessage,
  };
  const automaticTemplateReadiness =
    await getBusinessWhatsAppAutomaticReadiness(prisma, {
      businessId: business.id,
      wabaId: credential?.wabaId ?? null,
      language: business.cardDefaultLanguage,
      messages,
      automation,
    });

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
  const deliveryReady =
    connectionReadiness.automaticDeliveryReady && !automation.paused;

  const updateConnection = updateBusinessWhatsAppConnectionAction.bind(
    null,
    business.slug,
  );
  const updateAutomation = updateBusinessWhatsAppAutomationAction.bind(
    null,
    business.slug,
  );
  const completeEmbeddedSignup =
    completeBusinessWhatsAppEmbeddedSignupAction.bind(null, business.slug);
  const manageTemplate = manageBusinessWhatsAppTemplateAction.bind(
    null,
    business.slug,
  );

  const automationRows = [
    {
      event: "WELCOME" as const,
      title: t("ترحيب", "Welcome"),
      toggleName: "welcomeEnabled",
      messageName: "whatsappWelcomeMessage",
      enabled: automation.welcomeEnabled,
      message: business.whatsappWelcomeMessage,
      description: t(
        "تُرسل بعد انضمام عميل مؤهل وموافق على رسائل WhatsApp.",
        "Sent after an eligible customer joins and has WhatsApp consent.",
      ),
    },
    {
      event: "BALANCE_UPDATED" as const,
      title: t("تحديث الرصيد", "Balance Updated"),
      toggleName: "balanceUpdatedEnabled",
      messageName: "whatsappBalanceMessage",
      enabled: automation.balanceUpdatedEnabled,
      message: business.whatsappBalanceMessage,
      description: t(
        "تُرسل عندما يتغير رصيد الولاء في حدث مدعوم.",
        "Sent when the loyalty balance changes through a supported event.",
      ),
    },
    {
      event: "REWARD_READY" as const,
      title: t("مكافأة جاهزة", "Reward Ready"),
      toggleName: "rewardReadyEnabled",
      messageName: "whatsappRewardMessage",
      enabled: automation.rewardReadyEnabled,
      message: business.whatsappRewardMessage,
      description: t(
        "تُرسل عندما تصبح مكافأة العميل جاهزة.",
        "Sent when the customer's reward becomes ready.",
      ),
    },
    {
      event: "REWARD_REDEEMED" as const,
      title: t("تم استبدال المكافأة", "Reward Redeemed"),
      toggleName: "rewardRedeemedEnabled",
      messageName: "whatsappRedeemedMessage",
      enabled: automation.rewardRedeemedEnabled,
      message: business.whatsappRedeemedMessage,
      description: t(
        "تأكيد اختياري بعد استبدال المكافأة.",
        "Optional confirmation after a reward is redeemed.",
      ),
    },
    {
      event: "NEW_REWARD" as const,
      title: t("مكافأة جديدة", "New Reward"),
      toggleName: "newRewardEnabled",
      messageName: "newRewardMessage",
      enabled: automation.newRewardEnabled,
      message: automation.newRewardMessage,
      description: t(
        "تُستخدم لإبلاغ العملاء المؤهلين بمكافأة جديدة.",
        "Used to notify eligible customers about a new reward.",
      ),
    },
    {
      event: "NEW_OFFER" as const,
      title: t("عرض جديد", "New Offer"),
      toggleName: "newOfferEnabled",
      messageName: "newOfferMessage",
      enabled: automation.newOfferEnabled,
      message: automation.newOfferMessage,
      description: t(
        "تُستخدم لإبلاغ العملاء المؤهلين بعرض جديد.",
        "Used to notify eligible customers about a new offer.",
      ),
    },
  ];
  const bindingByEvent = new Map(
    bindings.map((binding) => [binding.event, binding]),
  );

  const connectionTitle =
    connectionReadiness.state === "NOT_CONNECTED"
      ? t("WhatsApp غير متصل", "WhatsApp not connected")
      : connectionReadiness.state === "READY"
        ? automation.paused
          ? t("WhatsApp متصل — الرسائل التلقائية متوقفة", "WhatsApp connected — automations paused")
          : t("WhatsApp متصل وجاهز", "WhatsApp connected and ready")
        : t("WhatsApp متصل ويحتاج إكمال الإعداد", "WhatsApp connected — setup needs attention");

  const statusMessage =
    query.whatsapp === "connected"
      ? t("تم ربط WhatsApp بالنشاط بنجاح.", "WhatsApp was connected successfully.")
      : query.whatsapp === "disconnected"
        ? t("تم فصل WhatsApp عن النشاط.", "WhatsApp was disconnected.")
        : query.whatsappAutomation === "saved"
          ? t("تم حفظ إعدادات الرسائل.", "Message settings were saved.")
          : query.whatsappTemplate === "approved"
            ? t("Meta اعتمدت الرسالة.", "Meta approved the message.")
            : query.whatsappTemplate === "pending"
              ? t("الرسالة قيد مراجعة Meta.", "The message is in Meta review.")
              : null;

  const errorMessage =
    query.whatsapp === "embedded-not-configured"
      ? t(
          "الربط الرسمي مع Meta غير متاح في هذه البيئة بعد.",
          "The official Meta connection is not available in this environment yet.",
        )
      : query.whatsapp === "embedded-invalid" || query.whatsapp === "embedded-failed"
        ? t(
            "لم يكتمل الربط مع Meta. لم يتم حفظ اتصال جزئي؛ حاول مرة أخرى.",
            "Meta did not complete the connection. No partial connection was saved; try again.",
          )
        : query.whatsappTemplate === "provider-error"
          ? t(
              "تعذر إكمال العملية مع Meta الآن. حاول التحقق من الحالة لاحقًا.",
              "The Meta operation could not be completed. Check the status again later.",
            )
          : query.whatsappTemplate === "rejected"
            ? t(
                "Meta طلبت تعديل هذه الرسالة قبل استخدامها.",
                "Meta requires changes before this message can be used.",
              )
            : query.whatsapp === "subscription-restricted" ||
                query.whatsappAutomation === "subscription-restricted"
              ? t(
                  "حالة الاشتراك الحالية تمنع تعديل إعدادات WhatsApp.",
                  "The current subscription state blocks WhatsApp settings changes.",
                )
              : null;

  const approvalLabel = (status: string) => {
    switch (status) {
      case "APPROVED":
        return t("معتمد", "Approved");
      case "PENDING":
        return t("قيد المراجعة", "In review");
      case "REJECTED":
        return t("يحتاج تعديل", "Needs changes");
      case "STALE":
        return t("النص تغير — أعد الإرسال", "Copy changed — resubmit");
      default:
        return t("مسودة", "Draft");
    }
  };

  return (
    <main
      className="min-h-screen px-4 py-6 sm:px-6 sm:py-8"
      dir={language === "AR" ? "rtl" : "ltr"}
      lang={locale}
    >
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/businesses/${business.slug}/settings`}
            className="text-sm font-semibold text-primary hover:underline"
          >
            {t("الرجوع إلى إعدادات النشاط", "Back to business settings")}
          </Link>
          <Link
            href={`/businesses/${business.slug}/whatsapp-history`}
            className="rounded-[var(--lf-radius-input)] border border-border bg-surface px-4 py-2 text-sm font-bold text-foreground"
          >
            {t("عرض الرسائل", "View messages")}
          </Link>
        </div>

        <header className="rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-foreground-subtle">
            {t("التكاملات", "Integrations")}
          </p>
          <h1 className="mt-2 text-2xl font-black text-foreground">WhatsApp</h1>
          <p className="mt-2 text-sm leading-6 text-foreground-muted">
            {t(
              "اربط رقم النشاط مرة واحدة، ثم اختر الرسائل التي تريد إرسالها لعملائك وتابع حالة التوصيل من صفحة الرسائل.",
              "Connect the business once, choose which customer messages to send, and track delivery from Messages.",
            )}
          </p>
        </header>

        {statusMessage ? (
          <p className="rounded-[var(--lf-radius-input)] border border-success/30 bg-success-subtle p-4 text-sm font-semibold text-success">
            {statusMessage}
          </p>
        ) : null}
        {errorMessage ? (
          <p className="rounded-[var(--lf-radius-input)] border border-danger/30 bg-danger-subtle p-4 text-sm font-semibold text-danger">
            {errorMessage}
          </p>
        ) : null}

        <section className="rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-foreground-subtle">
                {t("الاتصال", "Connection")}
              </p>
              <h2 className="mt-2 text-xl font-black text-foreground">{connectionTitle}</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-foreground-muted">
                {credential
                  ? t(
                      "تم حفظ اتصال النشاط بأمان. لا تحتاج إلى نسخ Access Token أو WABA ID أو Phone ID في الاستخدام العادي.",
                      "The business connection is stored securely. Normal use does not require copying access tokens, WABA IDs, or phone IDs.",
                    )
                  : t(
                      "استخدم زر Connect WhatsApp لإكمال الربط داخل نافذة Meta الرسمية.",
                      "Use Connect WhatsApp to complete setup through Meta's official flow.",
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
                    "الربط الرسمي موجود داخل Tanee لكنه غير متاح في هذه البيئة حتى يكتمل إعداد Meta الخاص بالمنصة.",
                    "The official flow is built into Tanee but is unavailable in this environment until the platform Meta setup is complete.",
                  )}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-6 grid gap-2 sm:grid-cols-3">
            {[
              {
                label: t("1. ربط WhatsApp", "1. Connect WhatsApp"),
                ready: Boolean(credential && senderReady),
              },
              {
                label: t("2. اعتماد الرسائل", "2. Message approval"),
                ready: automaticTemplateReadiness.ready,
              },
              {
                label: t("3. جاهز للإرسال", "3. Ready to send"),
                ready: deliveryReady,
              },
            ].map((step) => (
              <div
                key={step.label}
                className="rounded-xl border border-border bg-surface-subtle p-3"
              >
                <p className="text-sm font-bold text-foreground">{step.label}</p>
                <p className={`mt-1 text-xs font-bold ${step.ready ? "text-success" : "text-foreground-muted"}`}>
                  {step.ready ? t("مكتمل", "Complete") : t("مطلوب", "Required")}
                </p>
              </div>
            ))}
          </div>

          {automation.paused ? (
            <p className="mt-4 rounded-xl border border-warning/30 bg-warning-subtle p-4 text-sm font-semibold text-foreground">
              {t(
                "الإيقاف العام مفعّل. الاتصال محفوظ والإرسال اليدوي يظل متاحًا، لكن الرسائل التلقائية متوقفة.",
                "Global Pause is on. The connection is preserved and manual messaging remains available, but automatic messages are paused.",
              )}
            </p>
          ) : null}

          {isSuperAdmin ? (
            <details className="mt-6 rounded-xl border border-border bg-surface-subtle p-4">
              <summary className="cursor-pointer text-sm font-bold text-foreground">
                {t("تشخيص ودعم متقدم", "Advanced support diagnostics")}
              </summary>
              <p className="mt-2 text-xs leading-5 text-foreground-muted">
                {t(
                  "هذه الأدوات للدعم واختبارات المنصة فقط وليست جزءًا من رحلة صاحب النشاط.",
                  "These controls are for support and platform certification only; they are not part of the business-owner journey.",
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
                      "أدخل رمزًا جديدًا؛ الرمز المحفوظ لا يُعرض.",
                      "Enter a new token; the saved token is never displayed.",
                    )}
                    className="mt-2 min-h-12 w-full rounded-xl border border-border px-4 py-3"
                  />
                </label>
                <p className="text-xs text-foreground-muted">
                  {t(
                    `Graph API: ${graphApiVersion || "not configured"}`,
                    `Graph API: ${graphApiVersion || "not configured"}`,
                  )}
                </p>
                <button
                  type="submit"
                  className="min-h-12 rounded-xl border border-border bg-surface px-4 py-3 font-bold text-foreground sm:w-fit"
                >
                  {t("حفظ إعداد الدعم", "Save support setup")}
                </button>
              </form>
            </details>
          ) : null}
        </section>

        <section className="rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-foreground-subtle">
            {t("التحكم في الإرسال", "Sending controls")}
          </p>
          <h2 className="mt-2 text-xl font-black text-foreground">
            {t("الرسائل التلقائية", "Automatic messages")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-foreground-muted">
            {t(
              "كل رسالة لها مفتاح ونص مستقلان. إيقاف الرسالة لا يحذف نصها، والإيقاف العام لا يفصل WhatsApp.",
              "Each message has its own switch and copy. Turning a message off never deletes its copy, and Global Pause never disconnects WhatsApp.",
            )}
          </p>

          <form action={updateAutomation} className="mt-5 grid gap-4">
            <label className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-subtle p-4">
              <input
                type="checkbox"
                name="paused"
                defaultChecked={automation.paused}
                className="mt-1 h-4 w-4"
              />
              <span>
                <span className="block text-sm font-black text-foreground">
                  {t("إيقاف كل الرسائل التلقائية", "Pause all automatic messages")}
                </span>
                <span className="mt-1 block text-xs leading-5 text-foreground-muted">
                  {t(
                    "أوقف الأتمتة مؤقتًا مع الاحتفاظ بالنصوص والاختيارات والاتصال.",
                    "Pause automations while preserving copy, selections, and the connection.",
                  )}
                </span>
              </span>
            </label>

            {automationRows.map((row) => (
              <div key={row.event} className="rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-black text-foreground">{row.title}</p>
                    <p className="mt-1 text-xs leading-5 text-foreground-muted">
                      {row.description}
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <input
                      type="checkbox"
                      name={row.toggleName}
                      defaultChecked={row.enabled}
                      className="h-4 w-4"
                    />
                    {row.enabled ? t("ON", "ON") : t("OFF", "OFF")}
                  </label>
                </div>
                <textarea
                  name={row.messageName}
                  defaultValue={row.message ?? ""}
                  rows={4}
                  maxLength={2000}
                  placeholder={t(
                    "اكتب نص الرسالة هنا. يمكن تركه فارغًا كمسودة.",
                    "Write the message here. It may stay blank as a draft.",
                  )}
                  className="mt-3 w-full rounded-xl border border-border px-4 py-3 text-sm leading-6"
                />
              </div>
            ))}

            <button
              type="submit"
              className="min-h-12 rounded-xl bg-primary px-5 py-3 font-bold text-white sm:w-fit"
            >
              {t("حفظ الرسائل", "Save messages")}
            </button>
          </form>
        </section>

        <section className="rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-foreground-subtle">
            {t("اعتماد Meta", "Meta approval")}
          </p>
          <h2 className="mt-2 text-xl font-black text-foreground">
            {t("حالة الرسائل", "Message approval")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-foreground-muted">
            {t(
              "Meta تراجع الرسائل التي تبدأ المحادثة. Tanee يعرض الحالة الحقيقية القادمة من Meta ولا يعتمد الرسائل محليًا.",
              "Meta reviews messages that start conversations. Tanee shows the real provider state and never approves messages locally.",
            )}
          </p>

          <div className="mt-5 grid gap-3">
            {automationRows.map((row) => {
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
                ? (binding?.approvalStatus ?? "NOT_SUBMITTED")
                : binding
                  ? "STALE"
                  : "NOT_SUBMITTED";

              return (
                <div key={row.event} className="rounded-xl border border-border p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-black text-foreground">{row.title}</p>
                      <p className="mt-1 text-xs font-bold text-foreground-muted">
                        {message
                          ? approvalLabel(providerStatus)
                          : t("أضف نص الرسالة أولًا", "Add message copy first")}
                      </p>
                      {isSuperAdmin && bindingMatchesCurrent && binding ? (
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
                            ? t("إرسال/مزامنة", "Send / sync")
                            : t("إرسال للمراجعة", "Send for review")}
                        </button>
                        {bindingMatchesCurrent ? (
                          <button
                            type="submit"
                            name="intent"
                            value="refresh-template"
                            className="min-h-10 rounded-xl border border-border px-3 text-xs font-bold text-foreground"
                          >
                            {t("تحقق من الحالة", "Check status")}
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
