/**
 * Seed inicial de la base de datos.
 * Crea un usuario MANAGER y un usuario DRIVER de prueba.
 *
 * Ejecutar con: npx prisma db seed
 */

import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed...");

  const saltRounds = 12;

  // ── Manager ────────────────────────────────────────────────────────────────
  const managerEmail = "gestor@logistica.com";
  const existingManager = await prisma.user.findUnique({
    where: { email: managerEmail },
  });

  if (!existingManager) {
    const passwordHash = await bcrypt.hash("gestor1234", saltRounds);
    await prisma.user.create({
      data: {
        name: "Gestor Principal",
        email: managerEmail,
        passwordHash,
        role: Role.MANAGER,
        phone: "+54 11 0000-0000",
        active: true,
      },
    });
    console.log("✅ Manager creado:", managerEmail);
  } else {
    console.log("ℹ️  Manager ya existe:", managerEmail);
  }

  // ── Chofer ─────────────────────────────────────────────────────────────────
  const driverEmail = "chofer@logistica.com";
  const existingDriver = await prisma.user.findUnique({
    where: { email: driverEmail },
  });

  if (!existingDriver) {
    const passwordHash = await bcrypt.hash("chofer1234", saltRounds);
    await prisma.user.create({
      data: {
        name: "Chofer Principal",
        email: driverEmail,
        passwordHash,
        role: Role.DRIVER,
        phone: "+54 11 1111-1111",
        active: true,
      },
    });
    console.log("✅ Chofer creado:", driverEmail);
  } else {
    console.log("ℹ️  Chofer ya existe:", driverEmail);
  }

  console.log("🌱 Seed completado.");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
