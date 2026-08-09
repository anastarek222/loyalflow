export type SecurityNotificationEvent =
  | "PASSWORD_CHANGED"
  | "PASSWORD_RESET"
  | "SESSIONS_REVOKED"
  | "MFA_ENABLED"
  | "MFA_RECOVERY_CODE_USED";

type SecurityNotificationCopy = {
  title: string;
  message: string;
};

const EN_COPY: Record<SecurityNotificationEvent, SecurityNotificationCopy> = {
  PASSWORD_CHANGED: {
    title: "Password changed",
    message: "Your LoyalFlow account password was changed.",
  },
  PASSWORD_RESET: {
    title: "Password reset",
    message: "Your LoyalFlow account password was reset using the recovery flow.",
  },
  SESSIONS_REVOKED: {
    title: "Sessions revoked",
    message: "Your other LoyalFlow sessions were signed out.",
  },
  MFA_ENABLED: {
    title: "Multi-factor authentication enabled",
    message: "Multi-factor authentication was enabled for your Super Admin account.",
  },
  MFA_RECOVERY_CODE_USED: {
    title: "MFA recovery code used",
    message: "A one-time MFA recovery code was used to sign in to your Super Admin account.",
  },
};

const AR_COPY: Record<SecurityNotificationEvent, SecurityNotificationCopy> = {
  PASSWORD_CHANGED: {
    title: "تم تغيير كلمة المرور",
    message: "تم تغيير كلمة مرور حساب LoyalFlow الخاص بك.",
  },
  PASSWORD_RESET: {
    title: "تمت إعادة تعيين كلمة المرور",
    message: "تمت إعادة تعيين كلمة مرور حساب LoyalFlow باستخدام مسار الاسترداد.",
  },
  SESSIONS_REVOKED: {
    title: "تم إنهاء الجلسات الأخرى",
    message: "تم تسجيل خروج جلسات LoyalFlow الأخرى الخاصة بحسابك.",
  },
  MFA_ENABLED: {
    title: "تم تفعيل المصادقة متعددة العوامل",
    message: "تم تفعيل المصادقة متعددة العوامل لحساب Super Admin الخاص بك.",
  },
  MFA_RECOVERY_CODE_USED: {
    title: "تم استخدام رمز استرداد MFA",
    message: "تم استخدام رمز استرداد MFA لمرة واحدة لتسجيل الدخول إلى حساب Super Admin الخاص بك.",
  },
};

function isSecurityNotificationEvent(value: string): value is SecurityNotificationEvent {
  return Object.prototype.hasOwnProperty.call(EN_COPY, value);
}

export function getSecurityNotificationCopy(
  eventType: string,
  language: "AR" | "EN",
  fallback: SecurityNotificationCopy,
): SecurityNotificationCopy {
  if (!isSecurityNotificationEvent(eventType)) return fallback;
  return language === "AR" ? AR_COPY[eventType] : EN_COPY[eventType];
}

type NotificationStore = {
  securityNotification: {
    create(input: {
      data: {
        userId: string;
        eventType: string;
        title: string;
        message: string;
        metadata?: Record<string, string>;
      };
    }): Promise<unknown>;
  };
};

export async function recordSecurityNotification(
  store: NotificationStore,
  input: {
    userId: string;
    event: SecurityNotificationEvent;
    metadata?: Record<string, string>;
  },
) {
  const copy = EN_COPY[input.event];

  await store.securityNotification.create({
    data: {
      userId: input.userId,
      eventType: input.event,
      title: copy.title,
      message: copy.message,
      ...(input.metadata ? { metadata: input.metadata } : {}),
    },
  });
}
