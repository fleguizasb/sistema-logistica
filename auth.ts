/**
 * Configuración central de NextAuth v5 (auth.js).
 * Exporta: handlers (para la route handler), auth (para server components/API),
 * signIn y signOut (para server actions y client components).
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Contraseña demasiado corta"),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      authorize: async (credentials) => {
        // Validar formato
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        // Buscar usuario
        const user = await prisma.user.findFirst({
          where: { email, active: true },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            passwordHash: true,
          },
        });

        if (!user) return null;

        // Verificar contraseña
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        // Retornar sin el hash de contraseña
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],

  callbacks: {
    // Persiste id y role en el token JWT
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
      }
      return token;
    },
    // Expone id y role en la session del cliente
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 días
  },
});
