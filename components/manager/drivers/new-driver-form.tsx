"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createDriver } from "@/lib/actions/drivers";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export function NewDriverForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);

    const formData = new FormData(e.currentTarget);
    const result = await createDriver(formData);

    if (result && !result.success) {
      setError(result.error ?? "Error al crear el chofer");
      setIsPending(false);
    }
    // Si success, la server action redirige a /drivers automáticamente
  }

  return (
    <div className="max-w-md">
      <Link
        href="/drivers"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a choferes
      </Link>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        {/* Nombre */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
            Nombre completo
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="Juan García"
            className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="juan@sleepbox.com"
            className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Teléfono */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
            Teléfono <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            placeholder="+54 9 11 1234-5678"
            className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Contraseña */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="Mínimo 6 caracteres"
            className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            El chofer usará este email y contraseña para acceder desde su celular.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-3 pt-2">
          <Link
            href="/drivers"
            className="flex-1 h-10 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 h-10 rounded-lg bg-blue-600 text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creando...
              </>
            ) : (
              "Crear chofer"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
