"use server";

import { auth } from "@/auth";
import { canPerformSubscriptionOperation } from "@loyalflow/domain/billing/subscription-lifecycle";
import { customerTagNameSchema } from "@/lib/customers/notes-tags";
import { canManageCustomerNotesTags } from "@/lib/customers/feature-access";
import prisma from "@/lib/prisma";
import { opaqueIdSchema } from "@/lib/validation/action-input";
import {
  assignCustomerTagCommand,
  createAndAssignCustomerTagCommand,
  removeCustomerTagCommand,
} from "@/lib/server/business/customer-tag-write-command";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function getCustomerTagContext(slug: string, customerId: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const parsedCustomerId = opaqueIdSchema.safeParse(customerId);
  if (!parsedCustomerId.success) redirect(`/businesses/${slug}/customers`);

  const business = await prisma.business.findUnique({
    where: { slug },
    select: {
      id: true,
      plan: true,
      subscriptionLifecycleState: true,
    },
  });
  if (!business) redirect("/businesses");

  if (!canManageCustomerNotesTags(session.user, business.id, business.plan)) {
    redirect(`/businesses/${slug}/customers/${customerId}`);
  }

  const customer = await prisma.customer.findFirst({
    where: { id: parsedCustomerId.data, businessId: business.id },
    select: { id: true, publicToken: true },
  });
  if (!customer) redirect(`/businesses/${slug}/customers`);

  return { session, business, customer };
}

function revalidateCustomerTagSurfaces(
  slug: string,
  customerId: string,
  publicToken: string,
) {
  revalidatePath(`/businesses/${slug}/customers/${customerId}`);
  revalidatePath(`/businesses/${slug}/scan/customer/${customerId}`);
  revalidatePath(`/businesses/${slug}/customers`);
  revalidatePath(`/businesses/${slug}`);
  revalidatePath(`/businesses/${slug}/reports`);
  revalidatePath(`/businesses/${slug}/activity`);
  revalidatePath(`/card/${publicToken}`);
  revalidatePath("/dashboard");
}

function mapTagFailure(
  slug: string,
  customerId: string,
  reason: "INVALID_TAG" | "SUBSCRIPTION_RESTRICTED" | "TARGET_NOT_FOUND",
): never {
  if (reason === "SUBSCRIPTION_RESTRICTED") {
    redirect(`/businesses/${slug}/customers/${customerId}?error=subscription-restricted`);
  }
  if (reason === "INVALID_TAG") {
    redirect(`/businesses/${slug}/customers/${customerId}?error=tag-invalid`);
  }
  redirect(`/businesses/${slug}/customers/${customerId}`);
}

export async function createAndAssignCustomerTagCommandAction(
  slug: string,
  customerId: string,
  formData: FormData,
) {
  const { session, business, customer } = await getCustomerTagContext(
    slug,
    customerId,
  );
  const parsed = customerTagNameSchema.safeParse(formData.get("tagName"));
  if (!parsed.success) {
    redirect(`/businesses/${slug}/customers/${customer.id}?error=tag-invalid`);
  }

  const existingTag = await prisma.customerTag.findUnique({
    where: {
      businessId_name: { businessId: business.id, name: parsed.data },
    },
    select: { id: true },
  });
  const existingAssignment = existingTag
    ? await prisma.customerTagAssignment.findUnique({
        where: {
          customerId_tagId: { customerId: customer.id, tagId: existingTag.id },
        },
        select: { id: true },
      })
    : null;

  if (!existingAssignment) {
    const intent = existingTag ? "OPERATE" : "EXPAND";
    if (
      !canPerformSubscriptionOperation(
        business.subscriptionLifecycleState,
        intent,
      )
    ) {
      redirect(`/businesses/${slug}/customers/${customer.id}?error=subscription-restricted`);
    }
  }

  const result = await createAndAssignCustomerTagCommand({
    businessId: business.id,
    customerId: customer.id,
    tagName: parsed.data,
    actorId: session.user.id,
  });
  if (!result.ok) mapTagFailure(slug, customer.id, result.reason);

  revalidateCustomerTagSurfaces(slug, customer.id, customer.publicToken);
  redirect(`/businesses/${slug}/customers/${customer.id}?success=tag-assigned`);
}

export async function assignCustomerTagCommandAction(
  slug: string,
  customerId: string,
  tagId: string,
) {
  const parsedTagId = opaqueIdSchema.safeParse(tagId);
  if (!parsedTagId.success) {
    redirect(`/businesses/${slug}/customers/${customerId}?error=tag-invalid`);
  }

  const { session, business, customer } = await getCustomerTagContext(
    slug,
    customerId,
  );
  const tag = await prisma.customerTag.findFirst({
    where: { id: parsedTagId.data, businessId: business.id },
    select: { id: true },
  });
  if (!tag) {
    redirect(`/businesses/${slug}/customers/${customer.id}?error=tag-invalid`);
  }
  const existing = await prisma.customerTagAssignment.findUnique({
    where: { customerId_tagId: { customerId: customer.id, tagId: tag.id } },
    select: { id: true },
  });
  if (
    !existing &&
    !canPerformSubscriptionOperation(
      business.subscriptionLifecycleState,
      "OPERATE",
    )
  ) {
    redirect(`/businesses/${slug}/customers/${customer.id}?error=subscription-restricted`);
  }

  const result = await assignCustomerTagCommand({
    businessId: business.id,
    customerId: customer.id,
    tagId: tag.id,
    actorId: session.user.id,
  });
  if (!result.ok) mapTagFailure(slug, customer.id, result.reason);

  revalidateCustomerTagSurfaces(slug, customer.id, customer.publicToken);
  redirect(`/businesses/${slug}/customers/${customer.id}?success=tag-assigned`);
}

export async function removeCustomerTagCommandAction(
  slug: string,
  customerId: string,
  tagId: string,
) {
  const parsedTagId = opaqueIdSchema.safeParse(tagId);
  if (!parsedTagId.success) {
    redirect(`/businesses/${slug}/customers/${customerId}?error=tag-invalid`);
  }

  const { session, business, customer } = await getCustomerTagContext(
    slug,
    customerId,
  );
  const assignment = await prisma.customerTagAssignment.findFirst({
    where: {
      businessId: business.id,
      customerId: customer.id,
      tagId: parsedTagId.data,
    },
    select: { id: true },
  });
  if (
    assignment &&
    !canPerformSubscriptionOperation(
      business.subscriptionLifecycleState,
      "OPERATE",
    )
  ) {
    redirect(`/businesses/${slug}/customers/${customer.id}?error=subscription-restricted`);
  }

  const result = await removeCustomerTagCommand({
    businessId: business.id,
    customerId: customer.id,
    tagId: parsedTagId.data,
    actorId: session.user.id,
  });
  if (!result.ok) mapTagFailure(slug, customer.id, result.reason);

  revalidateCustomerTagSurfaces(slug, customer.id, customer.publicToken);
  redirect(`/businesses/${slug}/customers/${customer.id}?success=tag-removed`);
}
