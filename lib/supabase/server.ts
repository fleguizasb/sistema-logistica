/**
 * Cliente Supabase para uso EXCLUSIVO en el SERVIDOR.
 *
 * ⚠️  NUNCA importes este archivo desde Client Components.
 * ⚠️  La SERVICE_ROLE_KEY tiene acceso total a la DB sin restricciones RLS.
 *     Solo vive en el servidor.
 *
 * Usos válidos en este proyecto:
 *   - Publicar mensajes a canales de Broadcast (ej: notificar cambio de estado)
 *   - Operaciones admin que requieren bypass de RLS (si fuera necesario)
 *
 * Para acceso a datos, usar Prisma (lib/prisma.ts) que es más type-safe.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  // No lanzar error en build time, solo en runtime
  if (process.env.NODE_ENV !== "test") {
    console.warn(
      "⚠️  Variables de Supabase no configuradas: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
    );
  }
}

/**
 * Crea un cliente de Supabase con service role (server-side únicamente).
 * Se crea una nueva instancia por llamado para evitar problemas de estado
 * en entornos serverless.
 */
export function getSupabaseServerClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Variables de entorno de Supabase no configuradas en el servidor"
    );
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Publica una actualización de estado de un envío al canal de Broadcast.
 * El cliente del tracking (browser) recibe este mensaje via WebSocket.
 *
 * El canal se nombra `tracking:{trackingToken}`, donde el token es un UUID v4.
 * El nombre del canal es suficientemente secreto como para no ser adivinable.
 *
 * Seguridad:
 * - El servidor publica, el browser solo puede recibir en ese canal específico.
 * - El browser NUNCA consulta la tabla shipments directamente.
 * - Solo recibe el payload que el servidor decide enviar (status + historial).
 */
export async function broadcastTrackingUpdate(
  trackingToken: string,
  payload: {
    status: string;
    statusLabel: string;
    updatedAt: string;
    events: Array<{
      toStatus: string;
      statusLabel: string;
      notes: string | null;
      createdAt: string;
      createdByName: string;
    }>;
  }
) {
  try {
    const supabase = getSupabaseServerClient();
    const channel = supabase.channel(`tracking:${trackingToken}`);

    await channel.send({
      type: "broadcast",
      event: "status_update",
      payload,
    });

    // Limpiar el canal inmediatamente (serverless — no mantener conexiones)
    await supabase.removeChannel(channel);
  } catch (error) {
    // No fallar la operación principal si el broadcast falla
    console.error("Error al enviar broadcast de tracking:", error);
  }
}
