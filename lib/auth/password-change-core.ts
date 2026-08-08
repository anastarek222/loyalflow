import { compare, hash } from "bcryptjs";

import type { AppLanguage } from "@/lib/i18n";

export const PASSWORD_HASH_COST = 12;

export type PasswordChangeUser = {
  id: string;
  passwordHash: string;
  authVersion: number;
  language: AppLanguage;
  businessId: string | null;
  isActive: boolean;
  business: {
    isActive: boolean;
  } | null;
};

export type PasswordChangeStore = {
  findUserById(userId: string): Promise<PasswordChangeUser | null>;
  commitPasswordChange(input: {
    userId: string;
    businessId: string | null;
    passwordHash: string;
    expectedPasswordHash: string;
    expectedAuthVersion: number;
  }): Promise<boolean>;
};

export type PasswordChangeCrypto = {
  comparePassword(value: string, passwordHash: string): Promise<boolean>;
  hashPassword(value: string, cost: number): Promise<string>;
};

export type PasswordChangeResult =
  | { changed: true; language: AppLanguage }
  | {
      changed: false;
      reason:
        | "INCORRECT_CURRENT_PASSWORD"
        | "CREDENTIAL_CHANGED";
    };

const bcryptCrypto: PasswordChangeCrypto = {
  comparePassword: compare,
  hashPassword: hash,
};

export async function changePasswordWithStore(
  input: {
    userId: string;
    currentPassword: string;
    newPassword: string;
  },
  store: PasswordChangeStore,
  crypto: PasswordChangeCrypto = bcryptCrypto,
): Promise<PasswordChangeResult> {
  const user = await store.findUserById(input.userId);

  if (
    !user ||
    !user.isActive ||
    (user.business && !user.business.isActive)
  ) {
    return {
      changed: false,
      reason: "INCORRECT_CURRENT_PASSWORD",
    };
  }

  const currentPasswordMatches = await crypto.comparePassword(
    input.currentPassword,
    user.passwordHash,
  );

  if (!currentPasswordMatches) {
    return {
      changed: false,
      reason: "INCORRECT_CURRENT_PASSWORD",
    };
  }

  const passwordHash = await crypto.hashPassword(
    input.newPassword,
    PASSWORD_HASH_COST,
  );

  const committed = await store.commitPasswordChange({
    userId: user.id,
    businessId: user.businessId,
    passwordHash,
    expectedPasswordHash: user.passwordHash,
    expectedAuthVersion: user.authVersion,
  });

  if (!committed) {
    return {
      changed: false,
      reason: "CREDENTIAL_CHANGED",
    };
  }

  return {
    changed: true,
    language: user.language,
  };
}
