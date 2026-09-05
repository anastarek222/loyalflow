import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";

import { isCurrentAuthVersion } from "@/lib/auth/auth-version";
import { isEmailVerificationSatisfied } from "@/lib/auth/email-verification-access";
import { recordLoginDenial } from "@/lib/auth/login-observability";
import {
  createLoginAccountKey,
  DUMMY_PASSWORD_HASH,
} from "@/lib/auth/login-security";
import { isSuperAdminMfaLoginAllowed } from "@/lib/auth/super-admin-mfa";
import {
  isSuperAdminMfaEnabled,
  verifySuperAdminMfa,
} from "@/lib/auth/super-admin-mfa-runtime";
import prisma from "@/lib/prisma";
import {
  distributedRateLimit,
  getClientAddress,
} from "@/lib/utils/rate-limiter";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(10),
  mfaCode: z.string().trim().max(64).optional().default(""),
});

export const {
  handlers,
  auth,
  signIn,
  signOut,
} = NextAuth({
  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/login",
  },

  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        mfaCode: { label: "Authenticator or recovery code", type: "text" },
      },

      async authorize(credentials, request) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          recordLoginDenial("authorize", "invalid_input");
          return null;
        }

        const clientAddress = getClientAddress(request.headers);
        const limit = await distributedRateLimit(
          `credentials-login:${clientAddress}`,
          { limit: 10, windowMs: 15 * 60 * 1000 },
        );
        if (!limit.allowed) {
          recordLoginDenial("authorize", "rate_limited");
          return null;
        }

        const email = parsed.data.email.toLowerCase();
        const accountKey = createLoginAccountKey(email);
        const accountLimit = await distributedRateLimit(
          `credentials-login-account:${accountKey}`,
          { limit: 10, windowMs: 15 * 60 * 1000 },
        );
        if (!accountLimit.allowed) {
          recordLoginDenial("authorize", "rate_limited");
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email },
          include: { business: { select: { isActive: true } } },
        });

        const passwordMatches = await compare(
          parsed.data.password,
          user?.passwordHash ?? DUMMY_PASSWORD_HASH,
        );

        if (!user || !user.isActive || (user.business && !user.business.isActive)) {
          recordLoginDenial("authorize", "account_unavailable");
          return null;
        }

        if (!passwordMatches) {
          recordLoginDenial("authorize", "password_mismatch");
          return null;
        }
        if (!(await isEmailVerificationSatisfied(user.id))) {
          recordLoginDenial("authorize", "email_unverified");
          return null;
        }

        if (user.role === "SUPER_ADMIN") {
          const enabled = await isSuperAdminMfaEnabled(user.id);
          const mfaLimit = await distributedRateLimit(
            `super-admin-mfa-login:${clientAddress}:${user.id}`,
            { limit: 5, windowMs: 5 * 60 * 1000 },
          );
          const codeValid =
            enabled && parsed.data.mfaCode && mfaLimit.allowed
              ? await verifySuperAdminMfa({
                  userId: user.id,
                  code: parsed.data.mfaCode,
                })
              : false;

          if (!isSuperAdminMfaLoginAllowed({
            role: user.role,
            enabled,
            hasCode: Boolean(parsed.data.mfaCode),
            rateAllowed: mfaLimit.allowed,
            codeValid,
          })) {
            return null;
          }
        }

        return {
          id: user.id,
          name: [user.firstName, user.lastName].filter(Boolean).join(" "),
          email: user.email,
          role: user.role,
          businessId: user.businessId,
          authVersion: user.authVersion,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        token.role = user.role;
        token.businessId = user.businessId;
        token.authVersion = user.authVersion;
        return token;
      }

      if (!token.id) {
        return null;
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: token.id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          businessId: true,
          isActive: true,
          authVersion: true,
          business: { select: { isActive: true } },
        },
      });

      if (!currentUser) {
        return null;
      }

      if (!currentUser.isActive) {
        return null;
      }

      if (currentUser.business && !currentUser.business.isActive) {
        return null;
      }

      if (
        !isCurrentAuthVersion(
          token.authVersion,
          currentUser.authVersion,
        )
      ) {
        return null;
      }

      token.role = currentUser.role;
      token.businessId = currentUser.businessId;
      token.name = [currentUser.firstName, currentUser.lastName].filter(Boolean).join(" ");
      token.email = currentUser.email;
      return token;
    },

    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.businessId = token.businessId;
      session.user.authVersion = token.authVersion;
      return session;
    },
  },
});
