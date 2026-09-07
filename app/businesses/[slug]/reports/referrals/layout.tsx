import type { ReactNode } from "react";

import { auth } from "@/auth";
import { hasFeatureEntitlement } from "@/lib/entitlements";
import { canPerform } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";

type ReferralReportLayoutProps = {
  children: ReactNode;
  params: Promise<{ slug: string }>;
};

export default async function ReferralReportLayout({
  children,
  params,
}: ReferralReportLayoutProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { slug } = await params;
  const business = await prisma.business.findUnique({
    where: { slug },
    select: { id: true, slug: true, plan: true },
  });
  if (!business) notFound();

  if (!canPerform(session.user, business.id, "REPORTS_VIEW")) {
    redirect(`/businesses/${business.slug}`);
  }

  if (
    !hasFeatureEntitlement(business.plan, "REPORTING") ||
    !hasFeatureEntitlement(business.plan, "REFERRALS")
  ) {
    redirect(`/businesses/${business.slug}?error=plan-feature`);
  }

  return children;
}
