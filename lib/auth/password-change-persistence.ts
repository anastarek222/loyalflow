export type PasswordChangePersistenceInput = {
  userId: string;
  businessId: string | null;
  passwordHash: string;
  expectedPasswordHash: string;
  expectedAuthVersion: number;
  usedAt: Date;
};

export type PasswordChangePersistenceOperations = {
  conditionalUpdateUser(
    input: Omit<PasswordChangePersistenceInput, "usedAt">,
  ): Promise<number>;
  invalidateResetTokens(input: {
    userId: string;
    usedAt: Date;
  }): Promise<void>;
  createActivity?: () => Promise<void>;
};

export async function persistPasswordChangeWithinTransaction(
  input: PasswordChangePersistenceInput,
  operations: PasswordChangePersistenceOperations,
) {
  const updatedCount = await operations.conditionalUpdateUser({
    userId: input.userId,
    businessId: input.businessId,
    passwordHash: input.passwordHash,
    expectedPasswordHash: input.expectedPasswordHash,
    expectedAuthVersion: input.expectedAuthVersion,
  });

  if (updatedCount !== 1) {
    return false;
  }

  await operations.invalidateResetTokens({
    userId: input.userId,
    usedAt: input.usedAt,
  });
  await operations.createActivity?.();

  return true;
}
