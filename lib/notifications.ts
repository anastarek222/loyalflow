type NotificationTransaction = {
  notification: {
    create: (args: {
      data: {
        type: string;
        title: string;
        message: string;
        businessId: string;
        userId?: string;
      };
    }) => Promise<unknown>;
  };
};

type CreateBusinessNotificationInput = {
  type: string;
  title: string;
  message: string;
  businessId: string;
  userId?: string | null;
};

// Generic business notifications are in-app persistence only. This helper
// deliberately does not dispatch email, SMS, WhatsApp, push, or any external
// provider delivery. Delivery-channel integrations own their own contracts.
//
// Notification.isRead is a legacy, non-authoritative column. Per-user read
// state is derived from NotificationReadState and NotificationItemRead.
export async function createBusinessNotification(
  transaction: NotificationTransaction,
  input: CreateBusinessNotificationInput
) {
  return transaction.notification.create({
    data: {
      type: input.type,
      title: input.title,
      message: input.message,
      businessId: input.businessId,
      ...(input.userId
        ? {
            userId: input.userId,
          }
        : {}),
    },
  });
}
