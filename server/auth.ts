/**
 * Capa de auth del admin en el front unificado.
 *
 * Usa Supabase Auth (email + contraseña) con sesión en cookies (SSR) y la
 * tabla `admins` para roles. Toda verificación ocurre en el servidor.
 */
import { crearSupabaseServerClient } from "@/lib/supabase/server-client";
import { requireSupabaseAdmin } from "@/lib/supabase/server";

export type RolAdmin = "admin" | "supervisor";

export interface SesionAdmin {
  correo: string;
  rol: RolAdmin;
}

/**
 * Lee la sesión actual desde las cookies del servidor.
 * Devuelve null si no hay sesión válida o el correo no está en `admins`.
 */
export async function obtenerSesion(): Promise<SesionAdmin | null> {
  try {
    const supabase = await crearSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) return null;

    const correo = data.user.email;
    if (!correo) return null;

    const rol = await obtenerRol(correo);
    if (!rol) return null;

    return { correo, rol };
  } catch {
    return null;
  }
}

/**
 * Consulta el rol del administrador en la tabla `admins`.
 */
export async function obtenerRol(correo: string): Promise<RolAdmin | null> {
  const cliente = requireSupabaseAdmin();

  const { data } = await cliente
    .from("admins")
    .select("correo, rol")
    .eq("correo", correo)
    .maybeSingle();

  if (!data) return null;
  return data.rol as RolAdmin;
}

/**
 * Login con email y contraseña vía Supabase Auth.
 */
export async function login(
  email: string,
  password: string
): Promise<{ ok: boolean; mensaje?: string; sesion?: SesionAdmin }> {
  const correo = email.trim().toLowerCase();

  try {
    const supabase = await crearSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: correo,
      password,
    });

    if (error || !data.user) {
      return { ok: false, mensaje: "Correo o contraseña incorrectos." };
    }

    const correoSesion = data.user.email ?? "";
    const rol = await obtenerRol(correoSesion);
    if (!rol) {
      await supabase.auth.signOut();
      return {
        ok: false,
        mensaje: "Tu correo no tiene acceso al panel de administración.",
      };
    }

    return { ok: true, sesion: { correo: correoSesion, rol } };
  } catch {
    return { ok: false, mensaje: "No se pudo iniciar sesión." };
  }
}

/**
 * Cierra la sesión (borra la cookie).
 */
export async function logout(): Promise<void> {
  try {
    const supabase = await crearSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // Si falla, la cookie se ignora.
  }
}

/**
 * ¿La sesión tiene el rol requerido?
 */
export function requiereRol(
  sesion: SesionAdmin | null,
  rolRequerido: RolAdmin
): boolean {
  if (!sesion) return false;
  if (sesion.rol === "admin") return true;
  return rolRequerido === "supervisor";
}
