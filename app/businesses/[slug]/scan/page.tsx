/* eslint-disable @next/next/no-img-element */

import { auth } from "@/auth";
import { PageContainer, PageHeader } from "@/components/page-layout";
import QrScanner from "@/components/qr-scanner";
import { Card } from "@/components/ui/surface";
import { normalizeLanguage } from "@/lib/i18n";
import { canPerform } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { scanUiCopy } from "@/lib/scan/copy";
import { getBusinessTheme } from "@/lib/theme";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type ScanPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ScanPage({
  params,
}: ScanPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { slug } = await params;

  const authenticatedUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { language: true },
  });
  const language = normalizeLanguage(authenticatedUser?.language);
  const copy = scanUiCopy(language);

  const business = await prisma.business.findUnique({
    where: {
      slug,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
      primaryColor: true,
      secondaryColor: true,
      themePreset: true,
      cardStyle: true,
      fontFamily: true,
      logoUrl: true,
    },
  });

  if (!business || !business.isActive) {
    notFound();
  }

  const theme =
    getBusinessTheme(business);

  const canAccess = canPerform(
    session.user,
    business.id,
    "LOYALTY_EARN"
  );

  if (!canAccess) {
    redirect("/dashboard");
  }

  return (
    <main
      className="min-h-full py-6 sm:py-8"
      style={{
        backgroundColor: theme.backgroundColor,
        fontFamily: theme.fontFamily,
      }}
    >
      <PageContainer variant="narrow" className="px-4 sm:px-6">
        <PageHeader
          eyebrow={copy.scanner}
          title={copy.scanCustomerCard}
          description={copy.scanDescription}
          secondaryActions={
            <Link
              href={`/businesses/${business.slug}`}
              className="inline-flex min-h-11 items-center rounded-md border border-border bg-surface px-4 text-sm font-semibold text-slate-700 hover:bg-surface-subtle"
            >
              {copy.backToBusiness}
            </Link>
          }
        />

        <section
          className={`overflow-hidden border p-5 text-white sm:p-7 ${theme.cardClass} ${theme.borderClass}`}
          style={{
            backgroundColor: theme.primaryColor,
          }}
        >
          <div className="flex items-center gap-4">
            {business.logoUrl ? (
              <img
                src={business.logoUrl}
                alt={`${business.name} logo`}
                className="h-16 w-16 shrink-0 rounded-xl border border-white/20 bg-white object-contain p-2"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white/15 text-2xl font-black">
                {business.name
                  .trim()
                  .charAt(0)
                  .toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <p className="text-sm text-white/70">
                {copy.scanner}
              </p>

              <h2 className="mt-1 text-2xl font-bold sm:text-3xl">
                {business.name}
              </h2>

              <p
                dir="auto"
                className="mt-1 break-words text-sm text-white/75"
              >
                {copy.scanCustomerCard}
              </p>
            </div>
          </div>
        </section>

        <Card className={`${theme.cardClass} ${theme.borderClass} p-5 sm:p-7`}>
          <QrScanner businessId={business.id} language={language} />
        </Card>
      </PageContainer>
    </main>
  );
}
