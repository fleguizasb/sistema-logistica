"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";

const createUserSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  role: z.enum(["MANAGER", "DRIVER"], { message: "Rol inválido" }),
});

export async function createUser(formData: FormData) {
  const session = await auth();

  if (!session?.user?.isOwner) {
    return { success: false, error: "No autorizado" };
  }

  const parsed = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    password: formData.get("password"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    const firstError = parsed.error.errors[0]?.message ?? "Datos inválidos";
    return { success: false, error: firstError };
  }

  const { name, email, phone, password, role } = parsed.data;

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
      role,
      active: true,
      isOwner: false,
    },
  });

  revalidatePath("/admin");
  redirect("/admin");
}

export async function toggleUserActive(userId: string, active: boolean) {
  const session = await auth();

  if (!session?.user?.isOwner) {
    return { success: false, error: "No autorizado" };
  }

  // No permitir desactivarse a uno mismo
  if (userId === session.user.id) {
    return { success: false, error: "No podés desactivar tu propia cuenta" };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { active },
  });

  revalidatePath("/admin");
  return { success: true };
}
