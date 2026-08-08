import {
  activityActorFields,
  activityRequestMetadata,
} from "@/lib/activity/business-activity";
import type { ActivityRequestContext } from "@/lib/activity/request-context";

type PasswordChangeActor = {
  id: string;
  businessId: string | null;
  email?: string | null;
};

export function buildSelfPasswordChangeActivity(input: {
  actor: PasswordChangeActor;
  businessId: string;
  activityContext: ActivityRequestContext;
}) {
  return {
    type: "USER_PASSWORD_CHANGED" as const,
    description: "تم تغيير كلمة مرور الحساب",
    businessId: input.businessId,
    ...activityActorFields(input.actor, input.businessId),
    ...activityRequestMetadata(input.activityContext),
  };
}
