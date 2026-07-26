"use server";

import { auth } from "@/auth";
import {
  addBillingInterval,
  billingInputSchema,
  parseDateOnly,
  parseMoneyToMinor,
} from "@/lib/billing/subscription";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireSuperAdmin() {
  const session = await auth();

  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN") redirect("/dashboard");

  return session.user;
}

function refreshPlatform() {
  revalidatePath("/dashboard");
  revalidatePath("/businesses");
  revalidatePath("/business-owners");
}

export async function updateBusinessBillingAction(
  businessId: string,
  formData: FormData,
) {
  await requireSuperAdmin();

  const parsed = billingInputSchema.safeParse({
    billingInterval: formData.get("billingInterval"),
    billingCustomDays: formData.get("billingCustomDays") || undefined,
    subscriptionStartDate: formData.get("subscriptionStartDate") ?? "",
    nextPaymentDate: formData.get("nextPaymentDate") ?? "",
    lastPaymentDate: formData.get("lastPaymentDate") ?? "",
    subscriptionAmount: formData.get("subscriptionAmount") ?? "",
    billingCurrency: formData.get("billingCurrency") ?? "",
    paymentStatus: formData.get("paymentStatus"),
    gracePeriodDays: formData.get("gracePeriodDays") ?? 3,
    paymentMethod: formData.get("paymentMethod") ?? "",
    billingNotes: formData.get("billingNotes") ?? "",
    adminNotes: formData.get("adminNotes") ?? "",
  });

  if (!parsed.success) {
    redirect("/business-owners?error=billing-invalid");
  }

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true },
  });

  if (!business) redirect("/business-owners?error=not-found");

  await prisma.business.update({
    where: { id: business.id },
    data: {
      billingInterval: parsed.data.billingInterval,
      billingCustomDays:
        parsed.data.billingInterval === "CUSTOM"
          ? parsed.data.billingCustomDays ?? null
          : null,
      subscriptionStartDate: parseDateOnly(parsed.data.subscriptionStartDate),
      nextPaymentDate: parseDateOnly(parsed.data.nextPaymentDate),
      lastPaymentDate: parseDateOnly(parsed.data.lastPaymentDate),
      subscriptionAmountMinor: parseMoneyToMinor(parsed.data.subscriptionAmount),
      billingCurrency: parsed.data.billingCurrency || null,
      paymentStatus: parsed.data.paymentStatus,
      gracePeriodDays: parsed.data.gracePeriodDays,
      paymentMethod: parsed.data.paymentMethod || null,
      billingNotes: parsed.data.billingNotes || null,
      adminNotes: parsed.data.adminNotes || null,
    },
  });

  refreshPlatform();
  redirect("/business-owners?success=billing-updated");
}

export async function recordBusinessPaymentAction(businessId: string) {
  await requireSuperAdmin();

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      id: true,
      billingInterval: true,
      billingCustomDays: true,
      nextPaymentDate: true,
    },
  });

  if (!business) redirect("/business-owners?error=not-found");

  const paidAt = new Date();
  const cycleBase =
    business.nextPaymentDate && business.nextPaymentDate > paidAt
      ? business.nextPaymentDate
      : paidAt;

  await prisma.business.update({
    where: { id: business.id },
    data: {
      lastPaymentDate: paidAt,
      nextPaymentDate: addBillingInterval(
        cycleBase,
        business.billingInterval,
        business.billingCustomDays,
      ),
      paymentStatus: "PAID",
    },
  });

  refreshPlatform();
  redirect("/business-owners?success=payment-recorded");
}

export async function setBusinessPlatformStatusAction(
  businessId: string,
  isActive: boolean,
) {
  await requireSuperAdmin();

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true },
  });

  if (!business) redirect("/business-owners?error=not-found");

  await prisma.business.update({
    where: { id: business.id },
    data: {
      isActive,
      ...(isActive ? {} : { paymentStatus: "SUSPENDED" as const }),
    },
  });

  refreshPlatform();
  redirect(
    `/business-owners?success=${isActive ? "business-reactivated" : "business-suspended"}`,
  );
}
