"use server";

import { auth } from "@/auth";
import { isLoyalFlowPlan, type LoyalFlowPlan } from "@/lib/entitlements";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const nullableLimit = z.preprocess(
  (value) => {
    const text = String(value ?? "").trim();
    return text === "" ? null : text;
  },
  z.union([z.null(), z.coerce.number().int().min(0).max(10_000_000)]),
);

const limitsSchema = z.object({
  customerLimit: nullableLimit,
  userLimit: nullableLimit,
  branchLimit: nullableLimit,
  offerLimit: nullableLimit,
  rewardLimit: nullableLimit,
});

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN") redirect("/dashboard");
}

export async function updatePlanLimitsAction(
  plan: LoyalFlowPlan,
  formData: FormData,
) {
  await requireSuperAdmin();

  if (!isLoyalFlowPlan(plan)) redirect("/plans?error=invalid-plan");

  const parsed = limitsSchema.safeParse({
    customerLimit: formData.get("customerLimit"),
    userLimit: formData.get("userLimit"),
    branchLimit: formData.get("branchLimit"),
    offerLimit: formData.get("offerLimit"),
    rewardLimit: formData.get("rewardLimit"),
  });

  if (!parsed.success) redirect(`/plans?error=invalid-limits&plan=${plan}`);

  await prisma.planConfiguration.upsert({
    where: { plan },
    create: {
      plan,
      ...parsed.data,
    },
    update: parsed.data,
  });

  revalidatePath("/plans");
  revalidatePath("/business-owners");
  revalidatePath("/dashboard");
  revalidatePath("/businesses");
  redirect(`/plans?success=updated&plan=${plan}`);
}
