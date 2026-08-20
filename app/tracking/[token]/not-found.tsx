import Link from "next/link";
import { PackageX } from "lucide-react";

export default function TrackingNotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <PackageX className="w-8 h-8 text-gray-400" />
        </div>
        <h1 className="text-lg font-semibold text-gray-900 mb-2">
          Envío no encontrado
        </h1>
        <p className="text-sm text-gray-500">
          El link de seguimiento no es válido o el envío no existe.
          Verificá que el link sea correcto.
        </p>
      </div>
    </div>
  );
}
