"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createShipmentAsRequester } from "@/lib/actions/requester";
import { Loader2 } from "lucide-react";

interface Props {
  userId: string;
}

export default function NewOrderForm({ userId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const fd = new FormData(e.currentTarget);
    const data = {
      orderNumber: fd.get("orderNumber") as string,
      recipientName: fd.get("recipientName") as string,
      recipientPhone: fd.get("recipientPhone") as string,
      addressLine: fd.get("addressLine") as string,
      addressExtra: fd.get("addressExtra") as string,
      city: fd.get("city") as string,
      province: fd.get("province") as string,
      postalCode: fd.get("postalCode") as string,
      products: fd.get("products") as string,
      notes: fd.get("notes") as string,
    };

    startTransition(async () => {
      try {
        await createShipmentAsRequester(data);
        router.push("/orders");
      } catch (err: any) {
        setError(err.message ?? "Error al crear el pedido");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border p-6 space-y-5"
    >
      {/* Número de pedido */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Número de pedido / orden
        </label>
        <input
          name="orderNumber"
          type="text"
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="ej. 12345"
        />
      </div>

      {/* Destinatario */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del destinatario <span className="text-red-500">*</span>
          </label>
          <input
            name="recipientName"
            type="text"
            required
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nombre y apellido"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Teléfono
          </label>
          <input
            name="recipientPhone"
            type="tel"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="11 1234-5678"
          />
        </div>
      </div>

      {/* Dirección */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Dirección <span className="text-red-500">*</span>
        </label>
        <input
          name="addressLine"
          type="text"
          required
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Calle y número"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Piso / Dpto / Referencia
        </label>
        <input
          name="addressExtra"
          type="text"
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="ej. 2° B"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ciudad <span className="text-red-500">*</span>
          </label>
          <input
            name="city"
            type="text"
            required
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="ej. Buenos Aires"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Provincia <span className="text-red-500">*</span>
          </label>
          <input
            name="province"
            type="text"
            required
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="ej. CABA"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Código postal
          </label>
          <input
            name="postalCode"
            type="text"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="ej. 1001"
          />
        </div>
      </div>

      {/* Productos */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Productos / descripción del paquete
        </label>
        <textarea
          name="products"
          rows={3}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Listá los productos incluidos..."
        />
      </div>

      {/* Observaciones */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Observaciones
        </label>
        <textarea
          name="notes"
          rows={2}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Instrucciones especiales, horario de entrega..."
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium px-5 py-2.5 rounded-lg transition-colors text-sm"
        >
          {isPending && <Loader2 size={15} className="animate-spin" />}
          Crear pedido
        </button>
        <a
          href="/orders"
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Cancelar
        </a>
      </div>
    </form>
  );
}
