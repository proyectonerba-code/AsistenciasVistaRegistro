/**
 * Cliente de Supabase con service role (SOLO servidor).
 * Nunca se expone al navegador. Se usa para leer/escribir tablas
 * protegidas (usuarios, dispositivos, justificaciones, admins, etc.)
 * directamente desde el backend de este mismo front unificado.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let cliente: SupabaseClient;

if (!url || !serviceRoleKey) {
  // En desarrollo sin variables, se lanza al usarse.
  cliente = null as unknown as SupabaseClient;
} else {
  cliente = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export { url, serviceRoleKey };
export const supabaseAdmin = cliente;

export function requireSupabaseAdmin(): SupabaseClient {
  if (!cliente) {
    throw new Error(
      "Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el servidor del front unificado."
    );
  }
  return cliente;
}
