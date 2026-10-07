import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ─── Usuarios base ────────────────────────────────────────────────────────
  const managerHash = await bcrypt.hash("manager123", 10);
  const driverHash = await bcrypt.hash("chofer123", 10);
  const solicitanteHash = await bcrypt.hash("solicitante123", 10);

  const manager = await prisma.user.upsert({
    where: { email: "gestor@logistica.com" },
    update: {},
    create: {
      name: "Gestor Principal",
      email: "gestor@logistica.com",
      passwordHash: managerHash,
      role: Role.MANAGER,
      isOwner: true,
    },
  });

  const driver = await prisma.user.upsert({
    where: { email: "chofer@logistica.com" },
    update: {},
    create: {
      name: "Juan Chofer",
      email: "chofer@logistica.com",
      passwordHash: driverHash,
      role: Role.DRIVER,
    },
  });

  const solicitante = await prisma.user.upsert({
    where: { email: "ventas@logistica.com" },
    update: {},
    create: {
      name: "Equipo Ventas",
      email: "ventas@logistica.com",
      passwordHash: solicitanteHash,
      role: Role.SOLICITANTE,
    },
  });

  console.log(`✅ Usuario gestor: ${manager.email}`);
  console.log(`✅ Usuario chofer: ${driver.email}`);
  console.log(`✅ Usuario solicitante: ${solicitante.email}`);

  // ─── Empresas logísticas ──────────────────────────────────────────────────
  const internalCompany = await prisma.logisticsCompany.upsert({
    where: { id: "internal-fleet" },
    update: {},
    create: {
      id: "internal-fleet",
      name: "Flota Propia",
      isInternal: true,
      active: true,
      notes: "Entregas realizadas con nuestros propios choferes",
    },
  });

  const enviopack = await prisma.logisticsCompany.upsert({
    where: { id: "enviopack" },
    update: {},
    create: {
      id: "enviopack",
      name: "Enviopack",
      isInternal: false,
      active: true,
      website: "https://www.enviopack.com",
      trackingUrlTemplate: "https://enviopack.com/tracking/{code}",
      notes: "Logística externa — envíos al interior del país",
    },
  });

  const andreani = await prisma.logisticsCompany.upsert({
    where: { id: "andreani" },
    update: {},
    create: {
      id: "andreani",
      name: "Andreani",
      isInternal: false,
      active: true,
      website: "https://www.andreani.com",
      trackingUrlTemplate: "https://www.andreani.com/servicios/seguimiento?pieza={code}",
      notes: "Correo privado — cobertura nacional",
    },
  });

  console.log(`✅ Empresa logística: ${internalCompany.name}`);
  console.log(`✅ Empresa logística: ${enviopack.name}`);
  console.log(`✅ Empresa logística: ${andreani.name}`);

  console.log("\nSeed completado.");
  console.log("\n📋 Credenciales:");
  console.log("  Gestor:      gestor@logistica.com / manager123");
  console.log("  Chofer:      chofer@logistica.com / chofer123");
  console.log("  Solicitante: ventas@logistica.com / solicitante123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
