"use server";

import { auth } from "@/auth";
import type { FinancialOperationActor } from "@/lib/loyalty/operation-context";
import {
  resolveReversalException,
  type ReversalExceptionResolutionBlockReason,
} from "@/lib/loyalty/reversal-exception-resolution";
import {
  isFinancialOperationAbortedError,
  isFinancialOperationContextError,
} from "@/lib/loyalty/transactions";
import prisma from "@/lib/prisma";
import { opaqueIdSchema } from "@/lib/validation/action-input";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const reversalExceptionResolutionSchema = z.object({
  exceptionId: opaqueIdSchema,
  resolutionNote: z.string().trim().min(1).max(500),
});

function resolutionError(reason: ReversalExceptionResolutionBlockReason) {
  switch (reason) {
    case "EXCEPTION_NOT_FOUND":
      return "reversal-exception-missing";
    case "ALREADY_RESOLVED":
      return "reversal-exception-already-resolved";
  }
}

function resolutionWorkspace(slug: string) {
  return `/businesses/${slug}/reports/reversal-exceptions`;
}

export async function resolveReversalExceptionAction(
  slug: string,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const parsedInput = reversalExceptionResolutionSchema.safeParse({
    exceptionId: formData.get("exceptionId"),
    resolutionNote: formData.get("resolutionNote"),
  });

  if (!parsedInput.success) {
    redirect(`${resolutionWorkspace(slug)}?error=reversal-exception-invalid`);
  }

  const business = await prisma.business.findUnique({
    where: { slug },
    select: { id: true, slug: true },
  });

  if (!business) {
    redirect("/businesses");
  }

  const actor: FinancialOperationActor = {
    id: session.user.id,
    role: session.user.role,
    businessId: session.user.businessId ?? null,
  };
  const actorAllowed =
    actor.role === "SUPER_ADMIN" ||
    (actor.role === "OWNER" && actor.businessId === business.id);

  if (!actorAllowed) {
    redirect(`${resolutionWorkspace(slug)}?error=reversal-exception-permission`);
  }

  let result: Awaited<ReturnType<typeof resolveReversalException>>;
  try {
    result = await prisma.$transaction((transaction) =>
      resolveReversalException(transaction, {
        businessId: business.id,
        exceptionId: parsedInput.data.exceptionId,
        actor,
        resolutionNote: parsedInput.data.resolutionNote,
      }),
    );
  } catch (error) {
    if (isFinancialOperationContextError(error)) {
      redirect(`${resolutionWorkspace(slug)}?error=reversal-exception-context`);
    }
    if (isFinancialOperationAbortedError(error)) {
      redirect(`${resolutionWorkspace(slug)}?error=reversal-exception-aborted`);
    }
    throw error;
  }

  if (result.status === "BLOCKED") {
    redirect(
      `${resolutionWorkspace(slug)}?error=${resolutionError(result.reason)}`,
    );
  }

  revalidatePath(`/businesses/${slug}/reports`);
  revalidatePath(resolutionWorkspace(slug));

  redirect(
    `${resolutionWorkspace(slug)}?success=${
      result.status === "REPLAYED"
        ? "reversal-exception-resolution-replayed"
        : "reversal-exception-resolved"
    }`,
  );
}
