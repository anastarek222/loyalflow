import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";

import prisma from "@/lib/prisma";
import { getClientAddress, rateLimit } from "@/lib/utils/rate-limiter";

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(10),
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
        email: {
          label: "Email",
          type: "email",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },

      async authorize(credentials, request) {
        const parsed =
          loginSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const limit = rateLimit(
          `credentials-login:${getClientAddress(request.headers)}`,
          { limit: 10, windowMs: 15 * 60 * 1000 }
        );

        if (!limit.allowed) {
          return null;
        }

        const email =
          parsed.data.email.toLowerCase();

        const user =
          await prisma.user.findUnique({
            where: {
              email,
            },
            include: {
              business: {
                select: {
                  isActive: true,
                },
              },
            },
          });

        if (!user || !user.isActive) {
          return null;
        }

        if (
          user.business &&
          !user.business.isActive
        ) {
          return null;
        }

        const passwordMatches =
          await compare(
            parsed.data.password,
            user.passwordHash
          );

        if (!passwordMatches) {
          return null;
        }

        return {
          id: user.id,
          name: [
            user.firstName,
            user.lastName,
          ]
            .filter(Boolean)
            .join(" "),
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
        token.businessId =
          user.businessId;
        token.authVersion =
          user.authVersion;

        return token;
      }

      if (!token.id) {
        return null;
      }

      const currentUser =
        await prisma.user.findUnique({
          where: {
            id: token.id,
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            businessId: true,
            isActive: true,
            authVersion: true,
            business: {
              select: {
                isActive: true,
              },
            },
          },
        });

      if (!currentUser) {
        return null;
      }

      if (!currentUser.isActive) {
        return null;
      }

      if (
        currentUser.business &&
        !currentUser.business.isActive
      ) {
        return null;
      }

      if (
        token.authVersion !==
        currentUser.authVersion
      ) {
        return null;
      }

      token.role = currentUser.role;
      token.businessId =
        currentUser.businessId;
      token.name = [
        currentUser.firstName,
        currentUser.lastName,
      ]
        .filter(Boolean)
        .join(" ");
      token.email = currentUser.email;

      return token;
    },

    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.businessId =
        token.businessId;

      return session;
    },
  },
});
