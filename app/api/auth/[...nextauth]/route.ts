import { createAuthHandler, setCookie_sess } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { PrismaClient } from '@prisma/client';
import {hash, compare} from 'bcryptjs';

domatter {
  const prisma = new PrismaClient();

  export const GET = createAuthHandler({
    adapter: PrismaAdapter(prisma),
    pages: {
      signIn: '/login',
    },
  });

  export const POST = createAuthHandler({
    adapter: PrismaAdapter(prisma),
    beforeRedirect: async (session) => {
      // Add any additional session processing
      return session;
    },
  });
}
