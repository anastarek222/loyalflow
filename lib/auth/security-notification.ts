export type SecurityNotificationEvent =
  | "PASSWORD_CHANGED"
  | "PASSWORD_RESET"
  | "SESSIONS_REVOKED"
  | "MFA_ENABLED"
  | "MFA_RECOVERY_CODE_USED"
  | "LEGAL_TERMS_PRIVACY_ACCEPTED";

type SecurityNotificationCopy = {
  title: string;
  message: string;
};

const EN_COPY: Record<SecurityNotificationEvent, SecurityNotificationCopy> = {
  PASSWORD_CHANGED: {
    title: "Password changed",
    message: "Your Tanee account password was changed.",
  },
  PASSWORD_RESET: {
    title: "Password reset",
    message: "Your Tanee account password was reset using the recovery flow.",
  },
  SESSIONS_REVOKED: {
    title: "Sessions revoked",
    message: "Your other Tanee sessions were signed out.",
  },
  MFA_ENABLED: {
    title: "Multi-factor authentication enabled",
    message: "Multi-factor authentication was enabled for your Super Admin account.",
  },
  MFA_RECOVERY_CODE_USED: {
    title: "MFA recovery code used",
    message: "A one-time MFA recovery code was used to sign in to your Super Admin account.",
  },
  LEGAL_TERMS_PRIVACY_ACCEPTED: {
    title: "Terms and Privacy accepted",
    message: "You accepted Tanee's published Terms and Privacy Policy.",
  },
};

const AR_COPY: Record<SecurityNotificationEvent, SecurityNotificationCopy> = {
  PASSWORD_CHANGED: {
    title: "تم تغيير كلمة المرور",
    message: "تم تغيير كلمة مرور حساب تاني الخاص بك.",
  },
  PASSWORD_RESET: {
    title: "تمت إعادة تعيين كلمة المرور",
    message: "تمت إعادة تعيين كلمة مرور حساب تاني باستخدام مسار الاسترداد.",
  },
  SESSIONS_REVOKED: {
    title: "تم إنهاء الجلسات الأخرى",
    message: "تم تسجيل خروج جلسات تاني الأخرى الخاصة بحسابك.",
  },
  MFA_ENABLED: {
    title: "تم تفعيل المصادقة متعددة العوامل",
    message: "تم تفعيل المصادقة متعددة العوامل لحساب Super Admin الخاص بك.",
  },
  MFA_RECOVERY_CODE_USED: {
    title: "تم استخدام رمز استرداد MFA",
    message: "تم استخدام رمز استرداد MFA لمرة واحدة لتسجيل الدخول إلى حساب Super Admin الخاص بك.",
  },
  LEGAL_TERMS_PRIVACY_ACCEPTED: {
    title: "تمت الموافقة على الشروط والخصوصية",
    message: "وافقت على شروط تاني وسياسة الخصوصية المنشورتين.",
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
        createdAt?: Date;
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
    createdAt?: Date;
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
      ...(input.createdAt ? { createdAt: input.createdAt } : {}),
    },
  });
}
