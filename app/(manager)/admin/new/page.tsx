import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { NewUserForm } from "@/components/manager/admin/new-user-form";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Crear usuario — Logística SleepBox" };

export default async function NewUserPage() {
  const session = await auth();

  if (!session?.user) redirect("/login");
  if (!session.user.isOwner) redirect("/dashboard");

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Crear usuario</h1>
            <p className="text-sm text-gray-500 mt-0.5">Nuevo gestor o chofer</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-md">
          <NewUserForm />
        </div>
      </div>
    </div>
  );
}
