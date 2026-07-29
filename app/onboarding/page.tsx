import { auth } from "@/auth";
import { OwnerOnboardingWizard } from "@/components/owner-onboarding-wizard";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { launchOwnerOnboardingAction, saveOwnerOnboardingAction } from "./actions";

export default async function OwnerOnboardingPage() {
  const session = await auth(); if (!session?.user?.id) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, onboardingStatus: true, businessId: true, onboardingData: true } });
  if (!user || user.role !== "OWNER" || user.onboardingStatus !== "PENDING" || user.businessId) redirect("/dashboard");
  return <main className="min-h-screen bg-surface-subtle px-4 py-8"><OwnerOnboardingWizard draft={(user.onboardingData as Record<string, unknown> | null) ?? {}} saveAction={saveOwnerOnboardingAction} launchAction={launchOwnerOnboardingAction} /></main>;
}
