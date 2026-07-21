"use server";

import { auth } from "@/auth";
import {
  getBusinessPlaybook,
  getPlaybookBusinessUpdate,
  isBusinessConfiguredForPlaybook,
  playbookMatchesBusiness,
  type PlaybookBusinessState,
} from "@/lib/playbooks/catalog";
import { canManageBusiness } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { syncBusinessToGoogleSheetSafely } from "@/lib/google-sheets-sync-safe";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function playbookStateFromBusiness(business: {
  loyaltyMode: PlaybookBusinessState["loyaltyMode"];
  unitName: string;
  rewardName: string;
  rewardType: PlaybookBusinessState["rewardType"];
  rewardDescription: string | null;
  rewardThreshold: number;
  earnAmount: number;
  loyaltyProgramName: string | null;
  pointsName: string | null;
  membershipName: string | null;
  rewardCode: string | null;
  welcomeMessage: string | null;
  whatsappWelcomeMessage: string | null;
  whatsappBalanceMessage: string | null;
  whatsappRewardMessage: string | null;
  _count: { customers: number; transactions: number; rewards: number; promotions: number; offers: number };
  activities: Array<{ id: string }>;
}): PlaybookBusinessState {
  return {
    loyaltyMode: business.loyaltyMode,
    unitName: business.unitName,
    rewardName: business.rewardName,
    rewardType: business.rewardType,
    rewardDescription: business.rewardDescription,
    rewardThreshold: business.rewardThreshold,
    earnAmount: business.earnAmount,
    loyaltyProgramName: business.loyaltyProgramName,
    pointsName: business.pointsName,
    membershipName: business.membershipName,
    rewardCode: business.rewardCode,
    welcomeMessage: business.welcomeMessage,
    whatsappWelcomeMessage: business.whatsappWelcomeMessage,
    whatsappBalanceMessage: business.whatsappBalanceMessage,
    whatsappRewardMessage: business.whatsappRewardMessage,
    businessSettingsActivityCount: business.activities.length,
    customerCount: business._count.customers,
    transactionCount: business._count.transactions,
    rewardCount: business._count.rewards,
    promotionCount: business._count.promotions,
    offerCount: business._count.offers,
  };
}

async function getPlaybookContext(slug: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const business = await prisma.business.findUnique({ where: { slug }, select: { id: true, slug: true } });
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
  const playbook = getBusinessPlaybook(formData.get("playbook")?.toString());
  if (!playbook) redirect(`/businesses/${business.slug}/playbooks?error=invalid`);
  const confirmedExisting = formData.get("confirmExisting") === "on";

  const outcome = await prisma.$transaction(async (transaction) => {
    const current = await transaction.business.findUnique({
      where: { id: business.id },
      select: {
        loyaltyMode: true, unitName: true, rewardName: true, rewardType: true,
        rewardDescription: true, rewardThreshold: true, earnAmount: true,
        loyaltyProgramName: true, pointsName: true, membershipName: true,
        rewardCode: true, welcomeMessage: true, whatsappWelcomeMessage: true,
        whatsappBalanceMessage: true, whatsappRewardMessage: true,
        activities: { where: { type: "BUSINESS_SETTINGS_UPDATED" }, select: { id: true } },
        _count: { select: { customers: true, transactions: true, rewards: true, promotions: true, offers: true } },
      },
    });
    if (!current) return "missing" as const;
    const state = playbookStateFromBusiness(current);
    if (playbookMatchesBusiness(playbook, state)) return "already-applied" as const;
    if (isBusinessConfiguredForPlaybook(state) && !confirmedExisting) return "confirmation-required" as const;

    // Normal settings update + activity are committed together. Playbooks do
    // not create a reward, promotion, offer, campaign, or paid integration.
    await transaction.business.update({
      where: { id: business.id },
      data: getPlaybookBusinessUpdate(playbook),
    });
    await transaction.businessActivity.create({
      data: {
        type: "BUSINESS_SETTINGS_UPDATED",
        description: `تم تطبيق قالب تشغيل قابل للتعديل: ${playbook.name}`,
        businessId: business.id,
        createdById: session.user.id,
      },
    });
    return "applied" as const;
  });

  if (outcome === "confirmation-required") redirect(`/businesses/${business.slug}/playbooks?playbook=${playbook.id}&error=confirmation`);
  if (outcome === "already-applied") redirect(`/businesses/${business.slug}/playbooks?playbook=${playbook.id}&saved=already`);
  if (outcome === "missing") redirect("/businesses");

  await syncBusinessToGoogleSheetSafely(business.id);
  revalidatePlaybookPaths(business.slug);
  redirect(`/businesses/${business.slug}/playbooks?playbook=${playbook.id}&saved=1`);
}
