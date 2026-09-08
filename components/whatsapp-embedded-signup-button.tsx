"use client";

import { useEffect, useRef, useState } from "react";

type FacebookLoginResponse = {
  authResponse?: {
    code?: string;
  } | null;
};

type FacebookSdk = {
  init: (options: {
    appId: string;
    cookie: boolean;
    xfbml: boolean;
    version: string;
  }) => void;
  login: (
    callback: (response: FacebookLoginResponse) => void,
    options: Record<string, unknown>,
  ) => void;
};

declare global {
  interface Window {
    FB?: FacebookSdk;
    fbAsyncInit?: () => void;
  }
}

type Props = {
  language: "AR" | "EN";
  appId: string;
  configId: string;
  graphApiVersion: string;
  enabled: boolean;
  action: (formData: FormData) => void | Promise<void>;
  getActionFormData?: () => FormData;
};

type EmbeddedSignupResult = Readonly<{
  mode: "STANDARD" | "COEXISTENCE";
  wabaId: string;
  phoneNumberId?: string;
}>;

const ALLOWED_META_MESSAGE_ORIGINS = new Set([
  "https://www.facebook.com",
  "https://web.facebook.com",
]);

function validMetaId(value: unknown): value is string {
  return typeof value === "string" && /^\d{5,30}$/.test(value);
}

function parseEmbeddedSignupEvent(raw: unknown): EmbeddedSignupResult | null {
  let payload = raw;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload) as unknown;
    } catch {
      return null;
    }
  }
  if (!payload || typeof payload !== "object") return null;

  const event = payload as {
    type?: unknown;
    event?: unknown;
    data?: unknown;
  };
  if (event.type !== "WA_EMBEDDED_SIGNUP" || !event.data || typeof event.data !== "object") {
    return null;
  }

  const data = event.data as {
    waba_id?: unknown;
    phone_number_id?: unknown;
  };
  if (!validMetaId(data.waba_id)) return null;

  if (event.event === "FINISH") {
    if (!validMetaId(data.phone_number_id)) return null;
    return {
      mode: "STANDARD",
      wabaId: data.waba_id,
      phoneNumberId: data.phone_number_id,
    };
  }

  if (event.event === "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING") {
    if (
      data.phone_number_id !== undefined &&
      data.phone_number_id !== null &&
      data.phone_number_id !== "" &&
      !validMetaId(data.phone_number_id)
    ) {
      return null;
    }
    return {
      mode: "COEXISTENCE",
      wabaId: data.waba_id,
      ...(validMetaId(data.phone_number_id)
        ? { phoneNumberId: data.phone_number_id }
        : {}),
    };
  }

  return null;
}

function getEmbeddedSignupExtras() {
  const flow = process.env.NEXT_PUBLIC_WHATSAPP_EMBEDDED_SIGNUP_FLOW?.trim().toLowerCase();

  if (flow === "coexistence") {
    return {
      setup: {},
      featureType: "whatsapp_business_app_onboarding",
    } as const;
  }

  return {
    setup: {},
    featureType: "",
    sessionInfoVersion: "3",
  } as const;
}

export function WhatsAppEmbeddedSignupButton({
  language,
  appId,
  configId,
  graphApiVersion,
  enabled,
  action,
  getActionFormData,
}: Props) {
  const t = (ar: string, en: string) => (language === "AR" ? ar : en);
  const formRef = useRef<HTMLFormElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const modeRef = useRef<HTMLInputElement>(null);
  const wabaRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const pendingCode = useRef<string | null>(null);
  const pendingIds = useRef<EmbeddedSignupResult | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const initialize = () => {
      if (!window.FB) return;
      window.FB.init({
        appId,
        cookie: true,
        xfbml: false,
        version: graphApiVersion,
      });
      setSdkReady(true);
    };

    if (window.FB) {
      initialize();
      return;
    }

    window.fbAsyncInit = initialize;
    const existing = document.getElementById("facebook-jssdk");
    if (existing) return;

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    document.body.appendChild(script);
  }, [appId, enabled, graphApiVersion]);

  useEffect(() => {
    if (!enabled) return;

    const trySubmit = () => {
      if (!pendingCode.current || !pendingIds.current) return;
      if (
        !codeRef.current ||
        !modeRef.current ||
        !wabaRef.current ||
        !phoneRef.current
      ) {
        return;
      }

      codeRef.current.value = pendingCode.current;
      modeRef.current.value = pendingIds.current.mode;
      wabaRef.current.value = pendingIds.current.wabaId;
      phoneRef.current.value = pendingIds.current.phoneNumberId ?? "";
      formRef.current?.requestSubmit();
    };

    const handleMessage = (event: MessageEvent) => {
      if (!ALLOWED_META_MESSAGE_ORIGINS.has(event.origin)) return;
      const result = parseEmbeddedSignupEvent(event.data);
      if (!result) return;
      pendingIds.current = result;
      trySubmit();
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [enabled]);

  const startConnection = () => {
    setClientError(null);
    if (!enabled || !sdkReady || !window.FB) return;

    setConnecting(true);
    pendingCode.current = null;
    pendingIds.current = null;

    window.FB.login(
      (response) => {
        const code = response.authResponse?.code?.trim();
        if (!code) {
          setConnecting(false);
          setClientError(
            t(
              "لم يكتمل ربط WhatsApp. حاول مرة أخرى.",
              "WhatsApp connection was not completed. Try again.",
            ),
          );
          return;
        }

        pendingCode.current = code;
        if (
          pendingIds.current &&
          codeRef.current &&
          modeRef.current &&
          wabaRef.current &&
          phoneRef.current
        ) {
          codeRef.current.value = code;
          modeRef.current.value = pendingIds.current.mode;
          wabaRef.current.value = pendingIds.current.wabaId;
          phoneRef.current.value = pendingIds.current.phoneNumberId ?? "";
          formRef.current?.requestSubmit();
        }
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        extras: getEmbeddedSignupExtras(),
      },
    );
  };

  return (
    <form
      ref={formRef}
      action={async (embeddedSignupFormData) => {
        const formData = getActionFormData?.() ?? new FormData();
        for (const [key, value] of embeddedSignupFormData.entries()) {
          formData.set(key, value);
        }
        await action(formData);
        setConnecting(false);
      }}
      data-whatsapp-embedded-signup
    >
      <input ref={codeRef} type="hidden" name="authorizationCode" />
      <input ref={modeRef} type="hidden" name="mode" />
      <input ref={wabaRef} type="hidden" name="wabaId" />
      <input ref={phoneRef} type="hidden" name="phoneNumberId" />
      <button
        type="button"
        onClick={startConnection}
        disabled={!enabled || !sdkReady || connecting}
        className="min-h-12 rounded-xl bg-primary px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {connecting
          ? t("جارٍ ربط WhatsApp…", "Connecting WhatsApp…")
          : enabled
            ? t("ربط WhatsApp", "Connect WhatsApp")
            : t("إعداد الربط قيد التجهيز", "Connection setup is being prepared")}
      </button>
      {clientError ? (
        <p role="alert" className="mt-2 text-sm font-semibold text-danger">
          {clientError}
        </p>
      ) : null}
      {enabled && !sdkReady ? (
        <p className="mt-2 text-xs text-foreground-muted" aria-live="polite">
          {t("جارٍ تجهيز نافذة Meta…", "Preparing the Meta connection window…")}
        </p>
      ) : null}
    </form>
  );
}
