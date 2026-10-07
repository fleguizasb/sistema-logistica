// ─────────────────────────────────────────────────────────────────────────────
// PARCHE para tracking-client.tsx
//
// En el componente <TrackingClient>, agregar el bloque de logística externa
// DESPUÉS del bloque de estado actual y ANTES del historial:
//
// Si el envío viene de una empresa externa, mostrar el link de seguimiento.
// Los datos deben venir del servidor — agregar a la query inicial en page.tsx:
//   externalTrackingUrl: true,
//   externalTrackingCode: true,
//   logisticsCompany: { select: { name: true, isInternal: true } },
// ─────────────────────────────────────────────────────────────────────────────

// Insertar este bloque JSX dentro del return del componente:
//
// {shipment.externalTrackingUrl && (
//   <div className="bg-purple-50 border border-purple-200 rounded-xl px-5 py-4 flex items-start gap-3">
//     <ExternalLink size={20} className="text-purple-500 mt-0.5 flex-shrink-0" />
//     <div>
//       <p className="font-semibold text-purple-900 text-sm">
//         Este envío va por {shipment.logisticsCompany?.name ?? "logística externa"}
//       </p>
//       <p className="text-xs text-purple-600 mt-1">
//         Podés seguir tu paquete directamente en su sistema:
//       </p>
//       <a
//         href={shipment.externalTrackingUrl}
//         target="_blank"
//         rel="noopener noreferrer"
//         className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-purple-700 underline hover:text-purple-900"
//       >
//         Seguir en {shipment.logisticsCompany?.name ?? "logística externa"}
//         <ExternalLink size={13} />
//       </a>
//     </div>
//   </div>
// )}
//
// Agregar import al inicio del archivo:
// import { ExternalLink } from "lucide-react";

export {}; // Archivo de referencia — no importar en producción
