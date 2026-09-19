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
  getSuggestedWhatsAppTemplate,
  renderWhatsAppTemplate,
} from "@/lib/whatsapp-templates";
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
      unitName: true,
      rewardName: true,
      cardDefaultLanguage: true,
      whatsappWelcomeMessage: true,
      whatsappBalanceMessage: true,
      whatsappRewardMessage: true,
      whatsappRedeemedMessage: true,
    },
  });
  if (!business) notFound();
  if (!canManageBusiness(session.user, business.id)) redirect("/dashboard");

  const [currentUser, credential, bindings, automation, lastVerifiedSender] =
    await Promise.all([
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
      prisma.integrationJob.findFirst({
        where: {
          businessId: business.id,
          kind: "WHATSAPP_CUSTOMER_NOTIFICATION",
          providerWabaId: { not: null },
          providerPhoneNumberId: { not: null },
        },
        orderBy: { createdAt: "desc" },
        select: {
          providerWabaId: true,
          providerPhoneNumberId: true,
        },
      }),
    ]);
  if (!automation) notFound();

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

  const language = normalizeLanguage(currentUser?.language);
  const locale = getLanguageLocale(language);
  const t = (ar: string, en: string) => (language === "AR" ? ar : en);
  const eyebrowClass = `text-xs font-bold text-foreground-subtle ${
    language === "AR" ? "tracking-normal" : "uppercase tracking-[0.12em]"
  }`;
  const providerStatusLabel = (status: string) => {
    const labels: Record<string, [string, string]> = {
      APPROVED: ["معتمد", "Approved"],
      PENDING: ["قيد مراجعة Meta", "Pending Meta review"],
      REJECTED: ["مرفوض", "Rejected"],
      STALE: ["النص تغيّر ويحتاج إعادة إرسال", "Copy changed — resubmit"],
      NOT_SUBMITTED: ["لم يُرسل إلى Meta", "Not submitted"],
      UNKNOWN: ["حالة غير معروفة", "Unknown status"],
    };
    const label = labels[status] ?? labels.UNKNOWN!;
    return t(label[0], label[1]);
  };
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

  const statusMessage =
    query.whatsapp === "connected"
      ? t(
          "تم ربط WhatsApp بالنشاط بنجاح.",
          "WhatsApp was connected to this business successfully.",
        )
      : query.whatsapp === "disconnected"
        ? t(
            "تم فصل WhatsApp عن النشاط.",
            "WhatsApp was disconnected from this business.",
          )
        : query.whatsappAutomation === "saved"
          ? t(
              "تم حفظ إعدادات الرسائل التلقائية بدون حذف النصوص المتوقفة.",
              "Automation settings were saved without deleting copy for disabled events.",
            )
          : query.whatsappAutomation === "saved-needs-approval"
            ? t(
                "تم حفظ النصوص. أي Event طلبت تفعيله بدون قالب Meta معتمد ومطابق ظل متوقفًا تلقائيًا لحد الاعتماد.",
                "Copy was saved. Any event you tried to enable without a matching approved Meta template stayed OFF automatically until approval.",
              )
            : query.whatsappTemplate === "approved"
            ? t(
                "Meta تؤكد أن القالب معتمد.",
                "Meta confirms that the template is approved.",
              )
            : query.whatsappTemplate === "pending"
              ? t(
                  "تم إرسال القالب إلى Meta وهو قيد المراجعة.",
                  "The template is submitted to Meta and is pending review.",
                )
              : query.whatsappTemplate === "rejected"
                ? t(
                    "Meta رفضت القالب الحالي. الإرسال التلقائي لهذا الحدث متوقف.",
                    "Meta rejected the current template. Automatic delivery for this event is blocked.",
                  )
                : query.whatsappTemplate === "unknown"
                  ? t(
                      "تمت مزامنة القالب لكن Meta أعادت حالة غير معروفة؛ الإرسال متوقف احتياطيًا.",
                      "The template synced but Meta returned an unknown state; delivery remains fail-closed.",
                    )
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
            : query.whatsapp === "advanced-verification-failed"
              ? t(
                  "تعذر على Meta تأكيد أن رقم WhatsApp تابع لحساب WABA والتوكن المُدخل. لم يتم حفظ بيانات الاتصال.",
                  "Meta could not verify that the WhatsApp phone belongs to the supplied WABA and token. No connection details were saved.",
                )
              : query.whatsapp === "subscription-restricted" ||
                  query.whatsappAutomation === "subscription-restricted"
                ? t(
                    "لا يمكن تعديل إعدادات WhatsApp في حالة الاشتراك الحالية.",
                    "WhatsApp settings cannot be changed in the current subscription state.",
                  )
                : query.whatsappAutomation === "invalid-copy"
                  ? t(
                      "في نص رسالة متغير غير مدعوم. استخدم فقط المتغيرات المعروضة في قسم الأتمتة.",
                      "A message contains an unsupported variable. Use only the variables shown in the Automations section.",
                    )
                  : query.whatsappAutomation === "invalid"
                    ? t(
                        "راجع إعدادات الرسائل التلقائية وحاول مرة أخرى.",
                        "Review the automation settings and try again.",
                      )
                    : query.whatsappTemplate === "provider-error"
                    ? t(
                        "تعذر إكمال العملية مع Meta. لم يتم اعتماد أي حالة محليًا من عندنا.",
                        "The Meta operation could not be completed. Tanee did not invent or locally approve a provider state.",
                      )
                    : query.whatsappTemplate === "invalid"
                      ? t(
                          "طلب القالب غير صالح.",
                          "The template request is invalid.",
                        )
                      : null;

  const connectionTitle =
    automation.paused && credential
      ? t(
          "WhatsApp متصل — الأتمتة متوقفة",
          "WhatsApp connected — automations paused",
        )
      : connectionReadiness.state === "READY"
        ? t("WhatsApp جاهز", "WhatsApp ready")
        : connectionReadiness.state === "NOT_CONNECTED"
          ? t("WhatsApp غير متصل", "WhatsApp not connected")
          : t("WhatsApp يحتاج إجراء", "WhatsApp action required");

  const connectionDescription = automation.paused
    ? t(
        "الإيقاف العام يمنع الرسائل التلقائية فقط. الاتصال والإرسال اليدوي لا يتأثران.",
        "Global Pause blocks automatic messages only. The connection and manual messaging remain available.",
      )
    : connectionReadiness.reason === "READY"
      ? t(
          "الاتصال والرسائل التلقائية المختارة جاهزان.",
          "The connection and selected automatic messages are ready.",
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
                  "رقم النشاط متصل. فعّل رسالة تلقائية واحدة على الأقل عندما تكون جاهزًا.",
                  "The business number is connected. Enable at least one automatic message when ready.",
                )
              : t(
                  "رقم النشاط متصل، لكن رسالة مختارة واحدة على الأقل ما زالت تحتاج نصًا صالحًا واعتماد Meta.",
                  "The business number is connected, but at least one selected message still needs valid copy and Meta approval.",
                );

  const automationRows = [
    {
      event: "WELCOME" as const,
      title: t("الترحيب", "Welcome"),
      toggleName: "welcomeEnabled",
      messageName: "whatsappWelcomeMessage",
      enabled: automation.welcomeEnabled,
      savedMessage: business.whatsappWelcomeMessage,
      message:
        business.whatsappWelcomeMessage ??
        getSuggestedWhatsAppTemplate(business.cardDefaultLanguage, "WELCOME"),
      producerReady: true,
    },
    {
      event: "BALANCE_UPDATED" as const,
      title: t("تحديث الرصيد", "Balance Updated"),
      toggleName: "balanceUpdatedEnabled",
      messageName: "whatsappBalanceMessage",
      enabled: automation.balanceUpdatedEnabled,
      savedMessage: business.whatsappBalanceMessage,
      message:
        business.whatsappBalanceMessage ??
        getSuggestedWhatsAppTemplate(
          business.cardDefaultLanguage,
          "BALANCE_UPDATED",
        ),
      producerReady: true,
    },
    {
      event: "REWARD_READY" as const,
      title: t("مكافأة جاهزة", "Reward Ready"),
      toggleName: "rewardReadyEnabled",
      messageName: "whatsappRewardMessage",
      enabled: automation.rewardReadyEnabled,
      savedMessage: business.whatsappRewardMessage,
      message:
        business.whatsappRewardMessage ??
        getSuggestedWhatsAppTemplate(
          business.cardDefaultLanguage,
          "REWARD_READY",
        ),
      producerReady: true,
    },
    {
      event: "REWARD_REDEEMED" as const,
      title: t("تم استبدال المكافأة", "Reward Redeemed"),
      toggleName: "rewardRedeemedEnabled",
      messageName: "whatsappRedeemedMessage",
      enabled: automation.rewardRedeemedEnabled,
      savedMessage: business.whatsappRedeemedMessage,
      message:
        business.whatsappRedeemedMessage ??
        getSuggestedWhatsAppTemplate(
          business.cardDefaultLanguage,
          "REWARD_REDEEMED",
        ),
      producerReady: true,
    },
    {
      event: "NEW_REWARD" as const,
      title: t("مكافأة جديدة", "New Reward"),
      toggleName: "newRewardEnabled",
      messageName: "newRewardMessage",
      enabled: automation.newRewardEnabled,
      savedMessage: automation.newRewardMessage,
      message:
        automation.newRewardMessage ??
        getSuggestedWhatsAppTemplate(
          business.cardDefaultLanguage,
          "NEW_REWARD",
        ),
      producerReady: true,
    },
    {
      event: "NEW_OFFER" as const,
      title: t("عرض جديد", "New Offer"),
      toggleName: "newOfferEnabled",
      messageName: "newOfferMessage",
      enabled: automation.newOfferEnabled,
      savedMessage: automation.newOfferMessage,
      message:
        automation.newOfferMessage ??
        getSuggestedWhatsAppTemplate(business.cardDefaultLanguage, "NEW_OFFER"),
      producerReady: true,
    },
  ];
  const bindingByEvent = new Map(
    bindings.map((binding) => [binding.event, binding]),
  );

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
          <p className={eyebrowClass}>{t("التكاملات", "Integrations")}</p>
          <h1 className="mt-2 text-2xl font-black text-foreground">
            {t("WhatsApp", "WhatsApp")}
          </h1>
          <p className="mt-2 text-sm leading-6 text-foreground-muted">
            {t(
              "اربط WhatsApp مرة واحدة، ثم تحكم في كل رسالة تلقائية ونصها بشكل مستقل.",
              "Connect WhatsApp once, then control every automatic message and its copy independently.",
            )}
          </p>
          <p className="mt-1 text-xs leading-5 text-foreground-subtle">
            {t(
              "الترتيب الآمن: احفظ النص → أرسله إلى Meta → بعد ما يبقى Approved فعّل الـEvent. لو حاولت تفعّله بدري، Tanee يحفظ النص ويترك الـEvent متوقفًا بدل إنشاء رسائل فاشلة.",
              "Safe setup order: save copy → submit it to Meta → once Approved, enable the event. If you enable it too early, Tanee saves the copy but keeps that event OFF instead of creating failed deliveries.",
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
          data-whatsapp-automation-paused={automation.paused ? "true" : "false"}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-black text-foreground">
                {connectionTitle}
              </p>
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
                  className="min-h-12 rounded-xl border border-danger/30 px-4 py-3 text-sm font-bold text-danger"
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
                fallbackWabaId={lastVerifiedSender?.providerWabaId ?? undefined}
                fallbackPhoneNumberId={
                  lastVerifiedSender?.providerPhoneNumberId ?? undefined
                }
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

          {automation.paused ? (
            <p className="mt-5 rounded-xl border border-warning/30 bg-warning-subtle p-4 text-sm font-semibold text-foreground">
              {t(
                "الإيقاف المؤقت الشامل مفعّل. كل النصوص والاختيارات محفوظة، لكن لن تخرج رسائل تلقائية حتى تلغيه.",
                "Global Pause is on. All copy and selections are preserved, but no automatic messages will be sent until you turn it off.",
              )}
            </p>
          ) : null}

          {providerReadiness.providerReady &&
          senderReady &&
          !automaticTemplateReadiness.ready ? (
            <div className="mt-5 rounded-xl border border-warning/30 bg-warning-subtle p-4 text-sm leading-6 text-foreground">
              <p className="font-black">
                {automaticTemplateReadiness.hasEnabledMessages
                  ? t(
                      "اعتماد رسائل WhatsApp غير مكتمل.",
                      "WhatsApp message approval is incomplete.",
                    )
                  : t(
                      "لا توجد رسالة WhatsApp تلقائية مختارة.",
                      "No automatic WhatsApp message is selected.",
                    )}
              </p>
              {automaticTemplateReadiness.missingCopyEvents.length > 0 ? (
                <p className="mt-1 text-foreground-muted">
                  {t(
                    "بعض الرسائل المختارة ما زالت بلا نص. أضف النص أو أوقف الـEvent؛ النص لا يُحذف عند الإيقاف.",
                    "Some selected messages still have no copy. Add copy or disable the event; disabling never deletes the saved copy.",
                  )}
                </p>
              ) : null}
            </div>
          ) : null}

          {deliveryReady ? (
            <p className="mt-5 rounded-xl border border-success/30 bg-success-subtle p-4 text-sm font-semibold text-success">
              {t(
                "WhatsApp جاهز للإرسال التلقائي للحالات المختارة والمدعومة حاليًا.",
                "WhatsApp is ready for automatic delivery for the selected events that currently have producers.",
              )}
            </p>
          ) : null}

          <details
            className="mt-6 rounded-xl border border-border bg-surface-subtle p-4"
            data-whatsapp-advanced-setup
          >
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
          <p className={eyebrowClass}>{t("الأتمتة", "Automations")}</p>
          <h2 className="mt-2 text-xl font-black text-foreground">
            {t("الرسائل التلقائية", "Automatic WhatsApp messages")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-foreground-muted">
            {t(
              "لكل حدث مفتاح مستقل ونص مستقل. إيقاف المفتاح لا يحذف النص، والإيقاف المؤقت الشامل لا يفصل WhatsApp ولا يمنع الرسائل اليدوية.",
              "Every event has its own switch and copy. Turning a switch off never deletes its copy, and Global Pause never disconnects WhatsApp or blocks manual messaging.",
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
                  {t("إيقاف مؤقت شامل", "Global Pause")}
                </span>
                <span className="mt-1 block text-xs leading-5 text-foreground-muted">
                  {t(
                    "أوقف كل الرسائل التلقائية مؤقتًا مع الاحتفاظ بكل النصوص والـswitches كما هي.",
                    "Temporarily stop all automatic messages while preserving every message and event switch.",
                  )}
                </span>
              </span>
            </label>

            <div className="rounded-xl border border-primary/10 bg-primary-subtle/40 p-3 text-xs leading-5 text-foreground-muted">
              <p className="font-bold text-foreground">
                {t("المتغيرات المتاحة", "Available variables")}
              </p>
              <p className="mt-1 break-words font-mono" dir="ltr">
                {"{customer} {business} {balance} {unit} {reward} {offer} {remaining} {card_link}"}
              </p>
              <p className="mt-1">
                {t(
                  "{offer} يُستخدم لاسم العرض في New Offer، و{reward} يُستخدم لاسم المكافأة.",
                  "{offer} is the live offer name for New Offer; {reward} is the reward name.",
                )}
              </p>
            </div>

            {automationRows.map((row) => (
              <div
                key={row.event}
                className="rounded-xl border border-border p-4"
                data-whatsapp-automation-event={row.event}
                data-whatsapp-producer-ready={
                  row.producerReady ? "true" : "false"
                }
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-black text-foreground">{row.title}</p>
                    <p
                      className={`mt-1 text-xs font-semibold ${row.savedMessage ? "text-success" : "text-warning"}`}
                      data-whatsapp-copy-state={
                        row.savedMessage ? "saved" : "suggested-draft"
                      }
                    >
                      {row.savedMessage
                        ? t("النص محفوظ", "Copy saved")
                        : t(
                            "مسودة مقترحة — احفظ إعدادات WhatsApp أولًا قبل إرسالها إلى Meta.",
                            "Suggested draft — save WhatsApp settings before submitting it to Meta.",
                          )}
                    </p>
                    {!row.producerReady ? (
                      <p className="mt-1 text-xs leading-5 text-warning">
                        {t(
                          "يمكن تجهيز النص والمفتاح الآن؛ تشغيل حدث الإنشاء نفسه ينتظر WA-5 sync gate.",
                          "You can prepare the copy and switch now; the creation-event producer remains gated until WA-5 sync.",
                        )}
                      </p>
                    ) : null}
                  </div>
                  <label className="flex items-center gap-2 text-xs font-bold text-foreground">
                    <input
                      type="checkbox"
                      name={row.toggleName}
                      defaultChecked={row.enabled}
                      className="h-4 w-4"
                    />
                    {row.enabled ? t("مفعّل", "ON") : t("متوقف", "OFF")}
                  </label>
                </div>
                <textarea
                  name={row.messageName}
                  defaultValue={row.message ?? ""}
                  rows={4}
                  maxLength={2000}
                  placeholder={t(
                    "اكتب نص الرسالة هنا. يمكن تركه فارغًا كمسودة غير جاهزة.",
                    "Write the message copy here. It may stay blank as an unfinished draft.",
                  )}
                  className="mt-3 w-full rounded-xl border border-border px-4 py-3 text-sm leading-6"
                />
                <details className="mt-3 rounded-xl bg-surface-subtle p-3">
                  <summary className="cursor-pointer text-xs font-bold text-primary">
                    {t("معاينة ببيانات تجريبية", "Preview with sample data")}
                  </summary>
                  <p
                    className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground-muted"
                    dir="auto"
                  >
                    {renderWhatsAppTemplate(row.message ?? "", {
                      customer: t("أحمد", "Alex"),
                      business: business.name,
                      balance: 8,
                      unit: business.unitName ?? t("نقاط", "points"),
                      reward: business.rewardName ?? t("مكافأة", "Reward"),
                      offer: t("خصم 20% في نهاية الأسبوع", "20% weekend offer"),
                      remaining: 2,
                      cardLink: "https://gettanee.com/card/example",
                    })}
                  </p>
                </details>
              </div>
            ))}

            <button
              type="submit"
              className="min-h-12 rounded-xl bg-primary px-5 py-3 font-bold text-white sm:w-fit"
            >
              {t("حفظ إعدادات WhatsApp", "Save WhatsApp automations")}
            </button>
          </form>
        </section>

        <section className="mt-4 rounded-[var(--lf-radius-card)] border border-border bg-surface p-5 shadow-sm sm:p-6">
          <p className={eyebrowClass}>{t("قوالب Meta", "Meta Templates")}</p>
          <h2 className="mt-2 text-xl font-black text-foreground">
            {t("اعتماد رسائل WhatsApp", "WhatsApp message approval")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-foreground-muted">
            {t(
              `Tanee يرسل نفس النص المحفوظ الذي كتبه الـOwner إلى Meta تحت لغة البرنامج الحالية (${business.cardDefaultLanguage}). لازم تحفظ المسودة فوق الأول؛ المسودة المقترحة غير المحفوظة لا تُرسل إلى Meta. حالة الاعتماد تأتي من Meta وليست اختيارًا يدويًا داخل Tanee.`,
              `Tanee submits the same saved Owner-authored copy to Meta under the current program language (${business.cardDefaultLanguage}). Save the draft above first; an unsaved suggested draft is never submitted to Meta. Approval state comes from Meta and cannot be selected manually in Tanee.`,
            )}
          </p>

          <div className="mt-5 grid gap-3">
            {automationRows.map((row) => {
              const message = row.savedMessage?.trim() ?? "";
              const binding = bindingByEvent.get(row.event);
              const currentHash = message
                ? hashBusinessWhatsAppTemplate(message)
                : null;
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
                <div
                  key={row.event}
                  className="rounded-xl border border-border p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-black text-foreground">{row.title}</p>
                      <p className="mt-1 text-xs text-foreground-muted">
                        {message
                          ? `${t("حالة Meta", "Meta status")}: ${providerStatusLabel(providerStatus)}`
                          : t(
                              "لا يوجد نص محفوظ لإرساله إلى Meta. احفظ المسودة في قسم الأتمتة أولًا.",
                              "There is no saved copy to submit to Meta. Save the draft in Automations first.",
                            )}
                      </p>
                      {bindingMatchesCurrent && binding ? (
                        <p className="mt-1 break-all font-mono text-[11px] text-foreground-subtle">
                          {binding.templateName}
                        </p>
                      ) : null}
                    </div>

                    {message &&
                    credential?.wabaId &&
                    providerReadiness.providerReady ? (
                      <form
                        action={manageTemplate}
                        className="flex flex-wrap gap-2"
                      >
                        <input type="hidden" name="event" value={row.event} />
                        <button
                          type="submit"
                          name="intent"
                          value="submit-template"
                          className="min-h-10 rounded-xl bg-primary px-3 text-xs font-bold text-white"
                        >
                          {bindingMatchesCurrent
                            ? t("إعادة التحقق/الإرسال", "Reconcile/submit")
                            : t("إرسال النص المحفوظ", "Submit saved copy")}
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
