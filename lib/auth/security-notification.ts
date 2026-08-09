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

const COPY: Record<SecurityNotificationEvent, SecurityNotificationCopy> = {
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
  const copy = COPY[input.event];

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
