import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ShieldCheck, Plus, CheckCircle2, XCircle, Truck, Users } from "lucide-react";
import Link from "next/link";
import { ToggleUserActive } from "@/components/manager/admin/toggle-user-active";
import { ResetPasswordButton } from "@/components/manager/admin/reset-password-button";

export const metadata = { title: "Usuarios — Logística SleepBox" };

const ROLE_LABEL: Record<string, string> = {
  MANAGER: "Gestor",
  DRIVER: "Chofer",
};

const ROLE_COLOR: Record<string, string> = {
  MANAGER: "bg-purple-100 text-purple-700",
  DRIVER: "bg-blue-100 text-blue-700",
};

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user) redirect("/login");
  if (!session.user.isOwner) redirect("/dashboard");

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      active: true,
      isOwner: true,
      createdAt: true,
    },
  });

  const managers = users.filter((u) => u.role === "MANAGER");
  const drivers = users.filter((u) => u.role === "DRIVER");

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Usuarios</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {users.filter((u) => u.active).length} activos de {users.length} en total
              </p>
            </div>
          </div>
          <Link
            href="/admin/new"
            className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 h-9 rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Crear usuario
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6 max-w-3xl">
        {/* Gestores */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-purple-500" />
            <h2 className="text-sm font-semibold text-gray-700">
              Gestores ({managers.length})
            </h2>
          </div>
          <div className="space-y-2">
            {managers.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                currentUserId={session.user.id}
              />
            ))}
            {managers.length === 0 && (
              <p className="text-xs text-gray-400 pl-2">Sin gestores</p>
            )}
          </div>
        </section>

        {/* Choferes */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Truck className="w-4 h-4 text-blue-500" />
            <h2 className="text-sm font-semibold text-gray-700">
              Choferes ({drivers.length})
            </h2>
          </div>
          <div className="space-y-2">
            {drivers.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                currentUserId={session.user.id}
              />
            ))}
            {drivers.length === 0 && (
              <p className="text-xs text-gray-400 pl-2">Sin choferes</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function UserRow({
  user,
  currentUserId,
}: {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    active: boolean;
    isOwner: boolean;
  };
  currentUserId: string;
}) {
  const isMe = user.id === currentUserId;

  return (
    <div
      className={`bg-white border rounded-xl p-4 flex items-center gap-4 ${
        user.active ? "border-gray-200" : "border-gray-100 opacity-60"
      }`}
    >
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
        <span className="text-sm font-bold text-gray-600">
          {user.name.charAt(0).toUpperCase()}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-gray-900 truncate">{user.name}</p>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              ROLE_COLOR[user.role] ?? "bg-gray-100 text-gray-500"
            }`}
          >
            {ROLE_LABEL[user.role] ?? user.role}
          </span>
          {user.isOwner && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Admin
            </span>
          )}
          {user.active ? (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle2 className="w-3 h-3" /> Activo
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <XCircle className="w-3 h-3" /> Inactivo
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5 truncate">
          {user.email}
          {user.phone && <span className="ml-2">· {user.phone}</span>}
          {isMe && <span className="ml-2 text-blue-500 font-medium">· Vos</span>}
        </p>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Cambiar contraseña — disponible para todos los usuarios */}
        <ResetPasswordButton userId={user.id} userName={user.name} />

        {/* Toggle activo — no aparece para uno mismo */}
        {!isMe && (
          <ToggleUserActive userId={user.id} active={user.active} />
        )}
      </div>
    </div>
  );
}
