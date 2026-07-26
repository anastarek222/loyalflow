/* eslint-disable @next/next/no-img-element */

import { auth } from "@/auth";
import { PageContainer, PageHeader } from "@/components/page-layout";
import QrScanner from "@/components/qr-scanner";
import ScanCustomerSearch from "@/components/scan-customer-search";
import { Card } from "@/components/ui/card";
import { normalizeLanguage } from "@/lib/i18n";
import { canPerform } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { scanUiCopy } from "@/lib/scan/copy";
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
    >
      <PageContainer variant="narrow" className="px-4 sm:px-6">
        <PageHeader
          eyebrow={business.name}
          title={copy.scanCustomerCard}
          description={copy.scanDescription}
          secondaryActions={
            <Link
              href={`/businesses/${business.slug}`}
              className="inline-flex min-h-10 items-center rounded-[var(--lf-radius-input)] px-3 text-sm font-semibold text-foreground-muted hover:bg-surface-subtle"
            >
              {copy.backToBusiness}
            </Link>
          }
        />

        <Card className="overflow-hidden border-border p-0">
          <div className="flex items-center gap-3 border-b border-border bg-surface-subtle px-4 py-3 sm:px-5">
            {business.logoUrl ? (
              <img
                src={business.logoUrl}
                alt={`${business.name} logo`}
                className="size-10 shrink-0 rounded-[var(--lf-radius-input)] border border-border bg-white object-contain p-1.5"
              />
            ) : (
              <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--lf-radius-input)] bg-primary-subtle text-sm font-black text-primary">
                {business.name.trim().charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p dir="auto" className="truncate text-sm font-bold text-foreground">{business.name}</p>
              <p className="text-xs text-foreground-subtle">{copy.scanner}</p>
            </div>
          </div>
          <div className="p-4 sm:p-6">
            <QrScanner businessId={business.id} language={language} />
            <ScanCustomerSearch businessId={business.id} language={language} />
          </div>
        </Card>
      </PageContainer>
    </main>
  );
}
