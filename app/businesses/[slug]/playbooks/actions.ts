"use server";

import { auth } from "@/auth";
import { scheduleBusinessGoogleSheetsSync } from "@/lib/google-sheets-sync-scheduler";
import { getBusinessPlaybook } from "@/lib/playbooks/catalog";
import { canManageBusiness } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { applyBusinessPlaybookCommand } from "@/lib/server/business/playbook-application-command";
import { canPerformSubscriptionOperation } from "@loyalflow/domain/billing/subscription-lifecycle";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function getPlaybookContext(slug: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const business = await prisma.business.findUnique({
    where: { slug },
    select: { id: true, slug: true, subscriptionLifecycleState: true },
  });
  if (!business || !canManageBusiness(session.user, business.id)) redirect("/dashboard");
  return { session, business };
}

function revalidatePlaybookPaths(slug: string) {
  revalidatePath(`/businesses/${slug}`);
  revalidatePath(`/businesses/${slug}/settings`);
  revalidatePath(`/businesses/${slug}/playbooks`);
  revalidatePath(`/businesses/${slug}/activity`);
  revalidatePath("/card/[token]", "page");
}

export async function applyBusinessPlaybookAction(slug: string, formData: FormData) {
  const { session, business } = await getPlaybookContext(slug);
  if (
    !canPerformSubscriptionOperation(
      business.subscriptionLifecycleState,
      "OPERATE",
    )
  ) {
    redirect(`/businesses/${business.slug}/playbooks?error=subscription-restricted`);
  }
  const playbook = getBusinessPlaybook(formData.get("playbook")?.toString());
  if (!playbook) redirect(`/businesses/${business.slug}/playbooks?error=invalid`);
  const confirmedExisting = formData.get("confirmExisting") === "on";

  const outcome = await applyBusinessPlaybookCommand({
    businessId: business.id,
    playbook,
    confirmedExisting,
    actorId: session.user.id,
  });

  if (outcome === "confirmation-required") redirect(`/businesses/${business.slug}/playbooks?playbook=${playbook.id}&error=confirmation`);
  if (outcome === "already-applied") redirect(`/businesses/${business.slug}/playbooks?playbook=${playbook.id}&saved=already`);
  if (outcome === "subscription-restricted") redirect(`/businesses/${business.slug}/playbooks?error=subscription-restricted`);
  if (outcome === "missing") redirect("/businesses");

  scheduleBusinessGoogleSheetsSync(outcome.integrationJobId);
  revalidatePlaybookPaths(business.slug);
  redirect(`/businesses/${business.slug}/playbooks?playbook=${playbook.id}&saved=1`);
}
