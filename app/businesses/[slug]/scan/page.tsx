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
import {
  Camera,
  ChevronLeft,
  ScanLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

type ScanPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ScanPage({ params }: ScanPageProps) {
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

  const canAccess = canPerform(session.user, business.id, "LOYALTY_EARN");

  if (!canAccess) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-full bg-[radial-gradient(circle_at_top,var(--lf-primary-soft),transparent_32rem)] py-3 sm:py-10">
      <PageContainer
        variant="narrow"
        className="space-y-2 px-3 sm:space-y-8 sm:px-6"
      >
        <PageHeader
          eyebrow={copy.workspaceLabel}
          title={copy.scanCustomerCard}
          description={copy.scanDescription}
          className="hidden gap-3 p-4 sm:flex sm:gap-5 sm:p-6"
          secondaryActions={
            <Link
              href={`/businesses/${business.slug}`}
              className="inline-flex min-h-10 self-start items-center gap-2 rounded-[var(--lf-radius-input)] border border-border bg-surface/80 px-4 text-sm font-semibold text-foreground-muted shadow-sm transition hover:border-primary/25 hover:text-primary sm:min-h-11"
            >
              <ChevronLeft
                className="size-4 rtl:rotate-180"
                aria-hidden="true"
              />
              {copy.backToBusiness}
            </Link>
          }
        />

        <Card className="overflow-hidden border-primary/15 bg-surface/95 p-0 shadow-[0_24px_80px_-36px_rgba(79,70,229,0.45)]">
          <div className="hidden items-center gap-3 border-b border-border bg-gradient-to-r from-primary-subtle/80 to-surface px-4 py-3 sm:flex sm:px-6 sm:py-4">
            {business.logoUrl ? (
              <img
                src={business.logoUrl}
                alt={`${business.name} logo`}
                className="size-11 shrink-0 rounded-xl border border-white/80 bg-white object-contain p-1.5 shadow-sm"
              />
            ) : (
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-black text-white shadow-sm">
                {business.name.trim().charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p
                dir="auto"
                className="truncate text-sm font-bold text-foreground"
              >
                {business.name}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-foreground-subtle">
                <ShieldCheck
                  className="size-3.5 text-success"
                  aria-hidden="true"
                />
                {copy.scanner}
              </p>
            </div>
            <span className="ms-auto flex size-10 items-center justify-center rounded-full border border-primary/15 bg-white/80 text-primary">
              <ScanLine className="size-5" aria-hidden="true" />
            </span>
          </div>
          <div className="p-2 sm:p-7">
            <div className="mb-3 hidden items-start gap-2.5 rounded-2xl border border-primary/10 bg-primary-subtle/45 p-3 sm:mb-5 sm:flex sm:gap-3 sm:p-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-sm sm:size-10">
                <Camera className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 className="font-bold text-foreground">
                  {copy.cameraPanelTitle}
                </h2>
                <p className="mt-0.5 text-sm leading-5 text-foreground-muted sm:mt-1 sm:leading-6">
                  {copy.cameraPanelDescription}
                </p>
              </div>
            </div>
            <QrScanner businessId={business.id} language={language} />
            <ScanCustomerSearch businessId={business.id} language={language} />
          </div>
        </Card>

        <div className="hidden items-center justify-center gap-2 rounded-full px-4 text-center text-xs font-medium text-foreground-subtle sm:flex">
          <Sparkles className="size-4 text-primary" aria-hidden="true" />
          <span>{copy.scanTip}</span>
        </div>
      </PageContainer>
    </main>
  );
}
