import { createHash, randomBytes } from "node:crypto";

import { hash } from "bcryptjs";
import { z } from "zod";

import prisma from "@/lib/prisma";
import { recordSecurityNotification } from "@/lib/auth/security-notification";

export const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

export const passwordResetPasswordSchema = z
  .string()
  .min(10)
  .max(128);

export class PasswordResetError extends Error {
  constructor(
    public readonly reason:
      | "INVALID_PASSWORD"
      | "INVALID_OR_EXPIRED_TOKEN"
      | "USER_UNAVAILABLE",
  ) {
    super(reason);
    this.name = "PasswordResetError";
  }
}

export function hashPasswordResetToken(rawToken: string) {
  return createHash("sha256")
    .update(rawToken)
    .digest("hex");
}

export async function issuePasswordResetToken(input: {
  userId: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = hashPasswordResetToken(rawToken);
  const expiresAt = new Date(now.getTime() + PASSWORD_RESET_TTL_MS);

  return prisma.$transaction(async (transaction) => {
    const user = await transaction.user.findUnique({
      where: {
        id: input.userId,
      },
      select: {
        id: true,
        isActive: true,
        business: {
          select: {
            isActive: true,
          },
        },
      },
    });

    if (
      !user ||
      !user.isActive ||
      (user.business && !user.business.isActive)
    ) {
      throw new PasswordResetError("USER_UNAVAILABLE");
    }

    await transaction.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: {
        usedAt: now,
      },
    });

    await transaction.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    return {
      token: rawToken,
      expiresAt,
    };
  });
}

export async function consumePasswordResetToken(input: {
  token: string;
  newPassword: string;
  now?: Date;
}) {
  const parsedPassword =
    passwordResetPasswordSchema.safeParse(input.newPassword);

  if (!parsedPassword.success) {
    throw new PasswordResetError("INVALID_PASSWORD");
  }

  const now = input.now ?? new Date();
  const tokenHash = hashPasswordResetToken(input.token);
  const newPassword = parsedPassword.data;
  const passwordHash = await hash(newPassword, 12);

  return prisma.$transaction(async (transaction) => {
    const resetToken = await transaction.passwordResetToken.findUnique({
      where: {
        tokenHash,
      },
      select: {
        id: true,
        userId: true,
        usedAt: true,
        expiresAt: true,
        user: {
          select: {
            id: true,
            isActive: true,
            business: {
              select: {
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (
      !resetToken ||
      resetToken.usedAt !== null ||
      resetToken.expiresAt <= now ||
      !resetToken.user.isActive ||
      (resetToken.user.business &&
        !resetToken.user.business.isActive)
    ) {
      throw new PasswordResetError(
        "INVALID_OR_EXPIRED_TOKEN",
      );
    }

    const consumed =
      await transaction.passwordResetToken.updateMany({
        where: {
          id: resetToken.id,
          userId: resetToken.userId,
          usedAt: null,
          expiresAt: {
            gt: now,
          },
        },
        data: {
          usedAt: now,
        },
      });

    if (consumed.count !== 1) {
      throw new PasswordResetError(
        "INVALID_OR_EXPIRED_TOKEN",
      );
    }

    await transaction.user.update({
      where: {
        id: resetToken.userId,
      },
      data: {
        passwordHash,
        authVersion: {
          increment: 1,
        },
      },
    });

    await recordSecurityNotification(transaction, {
      userId: resetToken.userId,
      event: "PASSWORD_RESET",
    });

    return {
      userId: resetToken.userId,
    };
  });
}
