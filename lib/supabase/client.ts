/**
 * Cliente Supabase para uso en el BROWSER.
 *
 * ⚠️  SOLO usa la ANON KEY (variable pública NEXT_PUBLIC_*).
 * ⚠️  NUNCA importes este archivo desde Server Components o API Routes.
 * ⚠️  Solo se usa para suscribirse a canales de Broadcast (tracking público).
 *     NUNCA para consultas a la base de datos (eso lo hace Prisma, server-side).
 *
 * La ANON KEY con la política de RLS correcta no permite acceso a datos
 * fuera de lo explícitamente autorizado. El modelo de datos principal
 * se accede SIEMPRE mediante Prisma en el servidor.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

// Singleton: evita crear múltiples instancias en hot-reload
let clientInstance: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowserClient() {
  if (!clientInstance) {
    clientInstance = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        // Deshabilitamos la persistencia de sesión de Supabase Auth
        // porque usamos NextAuth.js para autenticación.
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }
  return clientInstance;
}
