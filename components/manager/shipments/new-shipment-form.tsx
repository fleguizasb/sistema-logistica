"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createShipment } from "@/lib/actions/shipments";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

const PROVINCES = [
  "Buenos Aires", "CABA", "Catamarca", "Chaco", "Chubut",
  "Córdoba", "Corrientes", "Entre Ríos", "Formosa", "Jujuy",
  "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén",
  "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz",
  "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán",
];

export function NewShipmentForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const data = {
      recipientName: form.get("recipientName") as string,
      recipientPhone: form.get("recipientPhone") as string,
      addressLine: form.get("addressLine") as string,
      addressExtra: form.get("addressExtra") as string,
      city: form.get("city") as string,
      province: form.get("province") as string,
      postalCode: form.get("postalCode") as string,
      products: form.get("products") as string,
      notes: form.get("notes") as string,
      orderNumber: form.get("orderNumber") as string,
    };

    if (!data.recipientName || !data.addressLine || !data.city || !data.province) {
      setError("Completá los campos obligatorios.");
      return;
    }

    startTransition(async () => {
      try {
        const shipment = await createShipment(data);
        router.push(`/shipments/${shipment.id}`);
      } catch (err: any) {
        setError(err.message ?? "Error al crear el envío.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto p-6 space-y-8">
        {/* Back */}
        <Link
          href="/shipments"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a envíos
        </Link>

        {/* Destinatario */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Destinatario</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Nombre completo <span className="text-red-500">*</span>
              </label>
              <Input name="recipientName" placeholder="Ej: Juan García" required />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Teléfono
              </label>
              <Input name="recipientPhone" type="tel" placeholder="Ej: 11 2345-6789" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                N° de pedido / orden
              </label>
              <Input name="orderNumber" placeholder="Ej: TN-12345" />
            </div>
          </div>
        </section>

        {/* Dirección */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Dirección de entrega</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Calle y número <span className="text-red-500">*</span>
              </label>
              <Input name="addressLine" placeholder="Ej: Av. Corrientes 1234" required />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Piso, depto, entre calles (opcional)
              </label>
              <Input name="addressExtra" placeholder="Ej: 3° B, entre Callao y Riobamba" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Ciudad <span className="text-red-500">*</span>
              </label>
              <Input name="city" placeholder="Ej: Buenos Aires" required />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Código postal
              </label>
              <Input name="postalCode" placeholder="Ej: 1414" />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Provincia <span className="text-red-500">*</span>
              </label>
              <select
                name="province"
                required
                defaultValue=""
                className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" disabled>Seleccioná una provincia</option>
                {PROVINCES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Contenido y notas */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Contenido y notas</h2>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Productos / descripción
            </label>
            <Textarea
              name="products"
              placeholder="Ej: Remera talle M, zapatos 42..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Notas internas
            </label>
            <Textarea
              name="notes"
              placeholder="Instrucciones especiales, observaciones..."
              rows={2}
            />
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Acciones */}
        <div className="flex gap-3 pb-6">
          <Link
            href="/shipments"
            className="flex-1 flex items-center justify-center h-10 rounded-md border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
          <Button
            type="submit"
            disabled={isPending}
            className="flex-1"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar envío"
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
