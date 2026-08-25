import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { User, ShieldCheck } from "lucide-react";
import { ChangePasswordForm } from "@/components/manager/admin/change-password-form";

export const metadata = { title: "Mi perfil — Logística SleepBox" };

const ROLE_LABEL: Record<string, string> = {
  MANAGER: "Gestor",
  DRIVER: "Chofer",
};

export default async function PerfilPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isOwner: true,
      createdAt: true,
    },
  });

  if (!user) redirect("/login");

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-lg mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Mi perfil</h1>
            <p className="text-sm text-gray-500">Información de tu cuenta</p>
          </div>
        </div>

        {/* Datos del usuario */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          {/* Avatar grande */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <span className="text-xl font-bold text-blue-700">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-base">{user.name}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                  {ROLE_LABEL[user.role] ?? user.role}
                </span>
                {user.isOwner && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Admin
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-3">
            <InfoRow label="Email" value={user.email} />
            {user.phone && <InfoRow label="Teléfono" value={user.phone} />}
            <InfoRow
              label="Miembro desde"
              value={new Date(user.createdAt).toLocaleDateString("es-AR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            />
          </div>
        </div>

        {/* Cambiar contraseña */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Cambiar contraseña</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Necesitás ingresar tu contraseña actual para confirmar el cambio.
            </p>
          </div>
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-xs text-gray-500 w-28 shrink-0">{label}</span>
      <span className="text-sm text-gray-900">{value}</span>
    </div>
  );
}
