import type { ReactNode } from "react";

import BusinessNotificationsDialogClient from "@/components/business-notifications-dialog-client";
import { getAuthenticatedAppLanguage } from "@/lib/auth/current-app-language";

type BusinessNotificationsDialogProps = {
  slug: string;
  unreadCount: number;
  children: ReactNode;
  trigger?: "button" | "shell";
};

export default async function BusinessNotificationsDialog({
  slug,
  unreadCount,
  children,
  trigger = "button",
}: BusinessNotificationsDialogProps) {
  const language = await getAuthenticatedAppLanguage();

  return (
    <BusinessNotificationsDialogClient
      slug={slug}
      unreadCount={unreadCount}
      trigger={trigger}
      language={language}
    >
      {children}
    </BusinessNotificationsDialogClient>
  );
}
