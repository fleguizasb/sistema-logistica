"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import bcrypt from "bcryptjs";

// ─── Cambiar la propia contraseña ─────────────────────────────────────────────

export async function changeMyPassword(
  currentPassword: string,
  newPassword: string
) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "No autorizado" };
  }

  if (newPassword.length < 6) {
    return { success: false, error: "La nueva contraseña debe tener al menos 6 caracteres" };
  }

  if (currentPassword === newPassword) {
    return { success: false, error: "La nueva contraseña debe ser diferente a la actual" };
  }

  // Obtener hash actual del usuario
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });

  if (!user) {
    return { success: false, error: "Usuario no encontrado" };
  }

  // Verificar contraseña actual
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return { success: false, error: "La contraseña actual es incorrecta" };
  }

  // Guardar nueva contraseña
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash },
  });

  return { success: true };
}
