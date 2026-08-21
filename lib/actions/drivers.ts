"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";

// ─── Crear chofer ─────────────────────────────────────────────────────────────

const createDriverSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export async function createDriver(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "MANAGER") {
    return { success: false, error: "No autorizado" };
  }

  const parsed = createDriverSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const firstError = parsed.error.errors[0]?.message ?? "Datos inválidos";
    return { success: false, error: firstError };
  }

  const { name, email, phone, password } = parsed.data;

  // Verificar que el email no esté en uso
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { success: false, error: "Ya existe un usuario con ese email" };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      name,
      email,
      phone: phone || null,
      passwordHash,
      role: "DRIVER",
      active: true,
    },
  });

  revalidatePath("/drivers");
  redirect("/drivers");
}

// ─── Activar / desactivar chofer ──────────────────────────────────────────────

export async function toggleDriverActive(driverId: string, active: boolean) {
  const session = await auth();
  if (!session?.user || session.user.role !== "MANAGER") {
    return { success: false, error: "No autorizado" };
  }

  await prisma.user.update({
    where: { id: driverId },
    data: { active },
  });

  revalidatePath("/drivers");
  return { success: true };
}
