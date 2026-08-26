import type { AppLanguage } from "@/lib/i18n";

type BusinessNotificationPresentationInput = Readonly<{
  type: string;
  title: string;
  message: string;
}>;

type BusinessNotificationPresentation = Readonly<{
  title: string;
  message: string;
}>;

const teamRoleLabels = {
  مالك: "Owner",
  مدير: "Manager",
  مشاهد: "Viewer",
  موظف: "Staff",
} as const;

function rawPresentation(
  input: BusinessNotificationPresentationInput,
): BusinessNotificationPresentation {
  return { title: input.title, message: input.message };
}

export function getBusinessNotificationPresentation(
  input: BusinessNotificationPresentationInput,
  language: AppLanguage,
): BusinessNotificationPresentation {
  if (language !== "EN") return rawPresentation(input);

  if (
    input.type === "REWARD_UNLOCKED" &&
    input.title === "تم فتح مكافأة جديدة"
  ) {
    const rewardMatch = input.message.match(/^تم فتح (.+) للعميل$/);
    if (rewardMatch) {
      return {
        title: "New reward unlocked",
        message: `Unlocked ${rewardMatch[1]} for the customer`,
      };
    }
  }

  if (
    input.type === "USER_CREATED" &&
    input.title === "تم إنشاء حساب فريق جديد"
  ) {
    const userMatch = input.message.match(
      /^تم إنشاء حساب (مالك|مدير|مشاهد|موظف) للبريد (.+)$/,
    );
    if (userMatch) {
      const role = teamRoleLabels[userMatch[1] as keyof typeof teamRoleLabels];
      return {
        title: "New team account created",
        message: `Created team account (${role}) for ${userMatch[2]}`,
      };
    }
  }

  return rawPresentation(input);
}
