/**
 * Configuración completa de NextAuth v5 (auth.js).
 * Exporta: handlers, auth, signIn, signOut.
 * Solo se usa en el servidor (nunca en el middleware edge).
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "@/auth.config";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Contraseña demasiado corta"),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
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

        // Buscar usuario activo
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
});
