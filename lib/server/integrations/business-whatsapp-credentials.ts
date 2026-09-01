import type { Prisma } from "@/generated/prisma/client";

export type BusinessWhatsAppCredential = Readonly<{
  businessId: string;
  phoneNumberId: string;
  accessTokenCiphertext: string;
  connectedAt: Date;
  updatedAt: Date;
}>;

type CredentialClient = Pick<Prisma.TransactionClient, "$queryRaw" | "$executeRaw">;

export async function getBusinessWhatsAppCredential(
  client: CredentialClient,
  businessId: string,
): Promise<BusinessWhatsAppCredential | null> {
  const rows = await client.$queryRaw<BusinessWhatsAppCredential[]>`
    SELECT
      "businessId",
      "phoneNumberId",
      "accessTokenCiphertext",
      "connectedAt",
      "updatedAt"
    FROM "BusinessWhatsAppCredential"
    WHERE "businessId" = ${businessId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function upsertBusinessWhatsAppCredential(
  client: CredentialClient,
  input: {
    businessId: string;
    phoneNumberId: string;
    accessTokenCiphertext: string;
  },
) {
  await client.$executeRaw`
    INSERT INTO "BusinessWhatsAppCredential" (
      "businessId",
      "phoneNumberId",
      "accessTokenCiphertext",
      "connectedAt",
      "updatedAt"
    )
    VALUES (
      ${input.businessId},
      ${input.phoneNumberId},
      ${input.accessTokenCiphertext},
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("businessId") DO UPDATE SET
      "phoneNumberId" = EXCLUDED."phoneNumberId",
      "accessTokenCiphertext" = EXCLUDED."accessTokenCiphertext",
      "connectedAt" = CURRENT_TIMESTAMP,
      "updatedAt" = CURRENT_TIMESTAMP
  `;
}

export async function deleteBusinessWhatsAppCredential(
  client: CredentialClient,
  businessId: string,
) {
  await client.$executeRaw`
    DELETE FROM "BusinessWhatsAppCredential"
    WHERE "businessId" = ${businessId}
  `;
}
