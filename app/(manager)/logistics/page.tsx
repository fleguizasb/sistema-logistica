import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import LogisticsConfig from "@/components/manager/logistics/logistics-config";

export const dynamic = "force-dynamic";

async function getData() {
  const [companies, rules] = await Promise.all([
    prisma.logisticsCompany.findMany({
      orderBy: [{ isInternal: "desc" }, { name: "asc" }],
      include: {
        _count: { select: { shipments: true } },
      },
    }),
    prisma.routingRule.findMany({
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      include: {
        logisticsCompany: { select: { name: true, isInternal: true } },
      },
    }),
  ]);
  return { companies, rules };
}

export default async function LogisticsPage() {
  const session = await auth();
  if (session?.user?.role !== "MANAGER") redirect("/dashboard");

  const { companies, rules } = await getData();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Empresas logísticas</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configurá las empresas de transporte y las reglas de ruteo automático.
        </p>
      </div>
      <LogisticsConfig companies={companies} rules={rules} />
    </div>
  );
}
