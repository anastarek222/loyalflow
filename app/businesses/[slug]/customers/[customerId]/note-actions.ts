"use server";

import { auth } from "@/auth";
import { canPerformSubscriptionOperation } from "@loyalflow/domain/billing/subscription-lifecycle";
import { customerNoteContentSchema } from "@/lib/customers/notes-tags";
import { canManageCustomerNotesTags } from "@/lib/customers/feature-access";
import prisma from "@/lib/prisma";
import { opaqueIdSchema } from "@/lib/validation/action-input";
import {
  createCustomerNoteCommand,
  updateCustomerNoteCommand,
} from "@/lib/server/business/customer-note-write-command";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function getCustomerNoteContext(slug: string, customerId: string) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const parsedCustomerId = opaqueIdSchema.safeParse(customerId);
  if (!parsedCustomerId.success) {
    redirect(`/businesses/${slug}/customers`);
  }

  const business = await prisma.business.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      plan: true,
      subscriptionLifecycleState: true,
    },
  });
  if (!business) {
    redirect("/businesses");
  }

  if (!canManageCustomerNotesTags(session.user, business.id, business.plan)) {
    redirect(`/businesses/${slug}/customers/${customerId}`);
  }

  const customer = await prisma.customer.findFirst({
    where: {
      id: parsedCustomerId.data,
      businessId: business.id,
    },
    select: {
      id: true,
      publicToken: true,
    },
  });
  if (!customer) {
    redirect(`/businesses/${slug}/customers`);
  }

  return { session, business, customer };
}

function revalidateCustomerNoteSurfaces(
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

export async function createCustomerNoteCommandAction(
  slug: string,
  customerId: string,
  formData: FormData,
) {
  const { session, business, customer } = await getCustomerNoteContext(
    slug,
    customerId,
  );
  const parsed = customerNoteContentSchema.safeParse(formData.get("content"));
  if (!parsed.success) {
    redirect(`/businesses/${slug}/customers/${customer.id}?error=note-invalid`);
  }

  if (
    !canPerformSubscriptionOperation(
      business.subscriptionLifecycleState,
      "OPERATE",
    )
  ) {
    redirect(
      `/businesses/${slug}/customers/${customer.id}?error=subscription-restricted`,
    );
  }

  const result = await createCustomerNoteCommand({
    businessId: business.id,
    customerId: customer.id,
    content: parsed.data,
    actorId: session.user.id,
  });

  if (!result.ok) {
    redirect(
      result.reason === "SUBSCRIPTION_RESTRICTED"
        ? `/businesses/${slug}/customers/${customer.id}?error=subscription-restricted`
        : `/businesses/${slug}/customers/${customer.id}`,
    );
  }

  revalidateCustomerNoteSurfaces(slug, customer.id, customer.publicToken);
  redirect(`/businesses/${slug}/customers/${customer.id}?success=note-created`);
}

export async function updateCustomerNoteCommandAction(
  slug: string,
  customerId: string,
  noteId: string,
  formData: FormData,
) {
  const parsedNoteId = opaqueIdSchema.safeParse(noteId);
  if (!parsedNoteId.success) {
    redirect(`/businesses/${slug}/customers/${customerId}?error=note-invalid`);
  }

  const { session, business, customer } = await getCustomerNoteContext(
    slug,
    customerId,
  );
  const parsed = customerNoteContentSchema.safeParse(formData.get("content"));
  if (!parsed.success) {
    redirect(`/businesses/${slug}/customers/${customer.id}?error=note-invalid`);
  }

  if (
    !canPerformSubscriptionOperation(
      business.subscriptionLifecycleState,
      "OPERATE",
    )
  ) {
    redirect(
      `/businesses/${slug}/customers/${customer.id}?error=subscription-restricted`,
    );
  }

  const result = await updateCustomerNoteCommand({
    businessId: business.id,
    customerId: customer.id,
    noteId: parsedNoteId.data,
    content: parsed.data,
    actorId: session.user.id,
  });

  if (!result.ok) {
    redirect(
      result.reason === "SUBSCRIPTION_RESTRICTED"
        ? `/businesses/${slug}/customers/${customer.id}?error=subscription-restricted`
        : `/businesses/${slug}/customers/${customer.id}`,
    );
  }

  revalidateCustomerNoteSurfaces(slug, customer.id, customer.publicToken);
  redirect(`/businesses/${slug}/customers/${customer.id}?success=note-updated`);
}
