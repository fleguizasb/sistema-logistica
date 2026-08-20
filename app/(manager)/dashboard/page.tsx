import { auth } from "@/auth";
import { Header } from "@/components/manager/header";
import { Package, Truck, CheckCircle2, AlertTriangle } from "lucide-react";
import { getDashboardStats } from "@/lib/actions/shipments";
import { STATUS_LABEL_MAP } from "@/lib/constants/shipment-status";
import { StatusBadge } from "@/components/ui/badge";
import Link from "next/link";

export const metadata = { title: "Dashboard — Sistema Logístico" };

export default async function DashboardPage() {
  const session = await auth();
  const stats = await getDashboardStats();

  return (
    <>
      <Header title="Dashboard" />

      <div className="flex-1 p-6 space-y-6">
        {/* Bienvenida */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Buen día, {session?.user?.name?.split(" ")[0]} 👋
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Aquí podés ver el resumen de hoy.
          </p>
        </div>

        {/* Tarjetas de métricas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="En preparación"
            value={stats.preparing}
            icon={Package}
            color="blue"
          />
          <MetricCard
            label="En camino"
            value={stats.inTransit}
            icon={Truck}
            color="yellow"
          />
          <MetricCard
            label="Entregados hoy"
            value={stats.deliveredToday}
            icon={CheckCircle2}
            color="green"
          />
          <MetricCard
            label="Incidencias"
            value={stats.incidents}
            icon={AlertTriangle}
            color="red"
          />
        </div>

        {/* Actividad reciente */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">
              Actividad reciente
            </h3>
            <Link
              href="/shipments"
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              Ver todos →
            </Link>
          </div>

          {stats.recentShipments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="w-10 h-10 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">
                No hay envíos registrados todavía.
              </p>
              <Link
                href="/shipments/new"
                className="mt-3 text-sm text-blue-600 hover:underline font-medium"
              >
                Cargar primer pedido →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {stats.recentShipments.map((s) => (
                <Link
                  key={s.id}
                  href={`/shipments/${s.id}`}
                  className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {s.recipientName}
                    </p>
                    <p className="text-xs text-gray-500">{s.city}</p>
                  </div>
                  <StatusBadge status={s.status} />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Componente tarjeta de métrica ────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: "blue" | "yellow" | "green" | "red";
}

const COLOR_MAP = {
  blue: { bg: "bg-blue-50", icon: "text-blue-600" },
  yellow: { bg: "bg-yellow-50", icon: "text-yellow-600" },
  green: { bg: "bg-green-50", icon: "text-green-600" },
  red: { bg: "bg-red-50", icon: "text-red-600" },
};

function MetricCard({ label, value, icon: Icon, color }: MetricCardProps) {
  const c = COLOR_MAP[color];
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
      <div
        className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}
      >
        <Icon className={`w-5 h-5 ${c.icon}`} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
        <p className="text-xs text-gray-500 mt-1 leading-tight">{label}</p>
      </div>
    </div>
  );
}
