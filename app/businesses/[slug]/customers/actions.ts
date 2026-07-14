"use server";

import { randomBytes } from "node:crypto";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { syncBusinessToGoogleSheetSafely } from "@/lib/google-sheets-sync-safe";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const customerSchema = z.object({
  firstName: z.string().trim().min(2).max(50),
  lastName: z.string().trim().max(50).optional(),
  phone: z.string().trim().min(8).max(25),
});

function normalizePhone(value: string) {
  const cleaned = value.replace(/[^\d+]/g, "");
  return cleaned.replace(/(?!^)\+/g, "");
}

async function generateCustomerCode(
  businessId: string,
  slug: string
) {
  const prefix =
    slug.replace(/[^a-z0-9]/gi, "").slice(0, 3).toUpperCase() ||
    "CUS";

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const suffix = randomBytes(3).toString("hex").toUpperCase();
    const customerCode = `${prefix}-${suffix}`;

    const existingCode = await prisma.customer.findFirst({
      where: {
        businessId,
        customerCode,
      },
      select: {
        id: true,
      },
    });

    if (!existingCode) {
      return customerCode;
    }
  }

  throw new Error("تعذر إنشاء كود عميل فريد");
}

export async function createCustomerAction(
  slug: string,
  formData: FormData
) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const business = await prisma.business.findUnique({
    where: {
      slug,
    },
    select: {
      id: true,
      slug: true,
    },
  });

  if (!business) {
    redirect("/businesses");
  }

  const canAccess =
    session.user.role === "SUPER_ADMIN" ||
    session.user.businessId === business.id;

  if (!canAccess) {
    redirect("/dashboard");
  }

  const parsed = customerSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName") || undefined,
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    redirect(`/businesses/${slug}/customers?error=invalid`);
  }

  const phone = normalizePhone(parsed.data.phone);

  if (!/^\+?\d{8,15}$/.test(phone)) {
    redirect(`/businesses/${slug}/customers?error=phone`);
  }

  const existingCustomer = await prisma.customer.findUnique({
    where: {
      businessId_phone: {
        businessId: business.id,
        phone,
      },
    },
    select: {
      id: true,
    },
  });

  if (existingCustomer) {
    redirect(`/businesses/${slug}/customers?error=duplicate`);
  }

  const customerCode = await generateCustomerCode(
    business.id,
    business.slug
  );

  const customerName = [
    parsed.data.firstName,
    parsed.data.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  const createdCustomer =
    await prisma.$transaction(async (transaction) => {
      const customer =
        await transaction.customer.create({
        data: {
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName || null,
          phone,
          customerCode,
          businessId: business.id,
        },
      });

    await transaction.businessActivity.create({
      data: {
        type: "CUSTOMER_CREATED",
        description: `تم إنشاء العميل ${customerName}`,
        businessId: business.id,
        customerId: customer.id,
        createdById: session.user.id,
      },
    });

      return customer;
    });

  await syncBusinessToGoogleSheetSafely(business.id);

  revalidatePath(`/businesses/${slug}`);
  revalidatePath(`/businesses/${slug}/customers`);
  revalidatePath(`/card/${createdCustomer.publicToken}`);
  revalidatePath("/dashboard");

  redirect(
    `/businesses/${slug}/customers/${createdCustomer.id}?success=created`
  );
}
