import { KeyRound } from "lucide-react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Card } from "@/components/ui/card";
import { PageContainer } from "@/components/page-layout/page-container";
import { getPasswordChangeCopy } from "@/lib/auth/password-change-copy";
import { normalizeLanguage } from "@/lib/i18n";
import prisma from "@/lib/prisma";

import { ChangePasswordForm } from "./change-password-form";

export default async function AccountSecurityPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { language: true },
  });

  if (!user) {
    redirect("/login");
  }

  const language = normalizeLanguage(user.language);
  const copy = getPasswordChangeCopy(language);

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
    </PageContainer>
  );
}
