import type { DefaultSession } from "next-auth";
import type { UserRole } from "../generated/prisma/client";

import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      businessId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role: UserRole;
    businessId: string | null;
    authVersion: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    businessId: string | null;
    authVersion: number;
  }
}

export {};
