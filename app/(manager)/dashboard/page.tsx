import { auth } from "@/auth";
import { Header } from "@/components/manager/header";
import { Package, Truck, CheckCircle2, AlertTriangle } from "lucide-react";

export const metadata = { title: "Dashboard — Sistema Logístico" };

export default async function DashboardPage() {
  const session = await auth();

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

        {/* Tarjetas de métricas — se poblarán con datos reales en la siguiente etapa */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="En preparación"
            value="—"
            icon={Package}
            color="blue"
          />
          <MetricCard
            label="En camino"
            value="—"
            icon={Truck}
            color="yellow"
          />
          <MetricCard
            label="Entregados hoy"
            value="—"
            icon={CheckCircle2}
            color="green"
          />
          <MetricCard
            label="Incidencias"
            value="—"
            icon={AlertTriangle}
            color="red"
          />
        </div>

        {/* Placeholder para actividad reciente */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Actividad reciente
          </h3>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="w-10 h-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">
              No hay envíos registrados todavía.
            </p>
            <a
              href="/shipments/upload"
              className="mt-3 text-sm text-blue-600 hover:underline font-medium"
            >
              Cargar primer pedido →
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

// Componente de tarjeta de métrica
interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: "blue" | "yellow" | "green" | "red" | "gray";
}

const COLOR_MAP = {
  blue: { bg: "bg-blue-50", icon: "text-blue-600", ring: "ring-blue-100" },
  yellow: { bg: "bg-yellow-50", icon: "text-yellow-600", ring: "ring-yellow-100" },
  green: { bg: "bg-green-50", icon: "text-green-600", ring: "ring-green-100" },
  red: { bg: "bg-red-50", icon: "text-red-600", ring: "ring-red-100" },
  gray: { bg: "bg-gray-50", icon: "text-gray-500", ring: "ring-gray-100" },
};

function MetricCard({ label, value, icon: Icon, color }: MetricCardProps) {
  const c = COLOR_MAP[color];
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-4.5 h-4.5 ${c.icon}`} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
        <p className="text-xs text-gray-500 mt-1 leading-tight">{label}</p>
      </div>
    </div>
  );
}
