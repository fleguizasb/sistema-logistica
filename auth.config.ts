/**
 * Configuración base de NextAuth — sin Prisma ni bcrypt.
 * Usada por el middleware para mantenerse liviana (Edge Runtime compatible).
 */

import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = (user as { role?: string }).role;
        token.isOwner = (user as { isOwner?: boolean }).isOwner ?? false;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { isOwner?: boolean }).isOwner = token.isOwner as boolean;
      }
      return session;
    },
  },
  providers: [],
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60,
  },
} satisfies NextAuthConfig;
