import { randomBytes } from "node:crypto";
import { z } from "zod";

export const customerRegistrationSchema = z.object({
  firstName: z.string().trim().min(2).max(50),
  lastName: z.string().trim().max(50).optional(),
  phone: z.string().trim().min(8).max(25),
});

type CustomerCodeLookup = {
  customer: {
    findFirst: (args: {
      where: {
        businessId: string;
        customerCode: string;
      };
      select: {
        id: true;
      };
    }) => Promise<{ id: string } | null>;
  };
};

export function normalizePhone(value: string) {
  const cleaned = value.replace(/[^\d+]/g, "");

  return cleaned.replace(/(?!^)\+/g, "");
}

export function parseCustomerRegistration(value: {
  firstName: FormDataEntryValue | null;
  lastName: FormDataEntryValue | null;
  phone: FormDataEntryValue | null;
}) {
  const parsed = customerRegistrationSchema.safeParse({
    firstName: value.firstName,
    lastName: value.lastName || undefined,
    phone: value.phone,
  });

  if (!parsed.success) {
    return null;
  }

  const phone = normalizePhone(parsed.data.phone);

  if (!/^\+?\d{8,15}$/.test(phone)) {
    return null;
  }

  return {
    ...parsed.data,
    phone,
  };
}

export async function generateCustomerCode(
  client: CustomerCodeLookup,
  businessId: string,
  slug: string
) {
  const prefix =
    slug.replace(/[^a-z0-9]/gi, "").slice(0, 3).toUpperCase() ||
    "CUS";

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const suffix = randomBytes(3).toString("hex").toUpperCase();
    const customerCode = `${prefix}-${suffix}`;

    const existingCode = await client.customer.findFirst({
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

export function getCustomerDisplayName({
  firstName,
  lastName,
}: {
  firstName: string;
  lastName?: string | null;
}) {
  return [firstName, lastName].filter(Boolean).join(" ");
}
