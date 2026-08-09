import { KeyRound, LogOut, ShieldAlert } from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { PageContainer } from "@/components/page-layout/page-container";
import { Card } from "@/components/ui/card";
import { getLogoutEverywhereCopy } from "@/lib/auth/logout-everywhere-copy";
import { getPasswordChangeCopy } from "@/lib/auth/password-change-copy";
import { getSecurityNotificationCopy } from "@/lib/auth/security-notification";
import { normalizeLanguage } from "@/lib/i18n";
import prisma from "@/lib/prisma";

import { ChangePasswordForm } from "./change-password-form";
import { LogoutEverywhereForm } from "./logout-everywhere-form";

export default async function AccountSecurityPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const [user, securityNotifications] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { language: true },
    }),
    prisma.securityNotification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        eventType: true,
        title: true,
        message: true,
        createdAt: true,
      },
    }),
  ]);

  if (!user) {
    redirect("/login");
  }

  const language = normalizeLanguage(user.language);
  const copy = getPasswordChangeCopy(language);
  const logoutCopy = getLogoutEverywhereCopy(language);
  const securityCopy =
    language === "AR"
      ? {
          title: "آخر تنبيهات الأمان",
          description: "أحداث أمان حديثة مرتبطة بحسابك فقط.",
          empty: "لا توجد تنبيهات أمان حتى الآن.",
        }
      : {
          title: "Recent security alerts",
          description: "Recent security events scoped only to your account.",
          empty: "No security alerts yet.",
        };

  return (
    <PageContainer variant="narrow">
      <header>
        <p className="text-sm font-bold text-primary">{copy.eyebrow}</p>
        <h1 className="mt-2 text-3xl font-black text-foreground">
          {copy.title}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-foreground-muted">
          {copy.description}
        </p>
      </header>

      <Card>
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--lf-radius-input)] bg-primary-subtle text-primary">
            <KeyRound size={20} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl font-black text-foreground">
              {copy.sectionTitle}
            </h2>
            <p className="mt-1 text-sm leading-6 text-foreground-muted">
              {copy.sectionDescription}
            </p>
          </div>
        </div>

        <ChangePasswordForm language={language} />
      </Card>

      <Card>
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--lf-radius-input)] bg-danger-subtle text-danger">
            <LogOut size={20} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl font-black text-foreground">
              {logoutCopy.sectionTitle}
            </h2>
            <p className="mt-1 text-sm leading-6 text-foreground-muted">
              {logoutCopy.sectionDescription}
            </p>
          </div>
        </div>

        <LogoutEverywhereForm language={language} />
      </Card>

      <Card>
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--lf-radius-input)] bg-primary-subtle text-primary">
            <ShieldAlert size={20} aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl font-black text-foreground">
              {securityCopy.title}
            </h2>
            <p className="mt-1 text-sm leading-6 text-foreground-muted">
              {securityCopy.description}
            </p>
          </div>
        </div>

        {securityNotifications.length === 0 ? (
          <p className="mt-5 text-sm text-foreground-muted">{securityCopy.empty}</p>
        ) : (
          <ol className="mt-5 space-y-3">
            {securityNotifications.map((notification) => {
              const notificationCopy = getSecurityNotificationCopy(
                notification.eventType,
                language,
                {
                  title: notification.title,
                  message: notification.message,
                },
              );

              return (
                <li
                  key={notification.id}
                  className="rounded-[var(--lf-radius-input)] border border-border px-4 py-3"
                >
                  <p className="text-sm font-bold text-foreground">
                    {notificationCopy.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-foreground-muted">
                    {notificationCopy.message}
                  </p>
                  <time
                    dateTime={notification.createdAt.toISOString()}
                    className="mt-2 block text-xs text-foreground-muted"
                  >
                    {notification.createdAt.toLocaleString(
                      language === "AR" ? "ar-EG" : "en-US",
                    )}
                  </time>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </PageContainer>
  );
}
