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
