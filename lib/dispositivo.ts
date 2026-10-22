"use client";

/**
 * Identificador del dispositivo (celular/tablet).
 *
 * Se guarda en localStorage como un UUID aleatorio. Sirve para:
 *   · Reconocer el teléfono en la terminal compartida (sin reidentificarse).
 *   · Analizar en el panel qué dispositivo usa cada colaborador.
 *   · Poder revocar el vínculo si alguien pierde o cambia de equipo.
 *
 * No es un secreto de por sí: la protección real la da la geocerca y la
 * validación del servidor.
 */

const CLAVE_HUELLA = "nerwork.huella";
const CLAVE_PERSONA = "nerwork.persona";

export interface VinculoPersona {
  id: string;
  nombre: string;
  area: string;
}

export interface Dispositivo {
  huella: string;
  etiqueta: string;
}

/** UUID aleatorio y estable para este navegador. */
export function obtenerHuella(): string {
  if (typeof window === "undefined") return "";

  try {
    let huella = window.localStorage.getItem(CLAVE_HUELLA);
    if (!huella) {
      const uuid =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
      huella = uuid.replace(/-/g, "");
      window.localStorage.setItem(CLAVE_HUELLA, huella);
    }
    return huella;
  } catch {
    // Modo privado sin localStorage: se usa una huella de sesión.
    return `s-${Math.random().toString(36).slice(2, 12)}`;
  }
}

/**
 * Nombre legible del dispositivo, según el user agent.
 * Ejemplos: "iPhone", "iPad", "Samsung Galaxy", "Android".
 */
export function nombreDispositivo(): string {
  if (typeof navigator === "undefined") return "Dispositivo";

  const ua = navigator.userAgent || "";
  const android = /Android/i.test(ua);

  if (/iPad/i.test(ua)) return "iPad";
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPod/i.test(ua)) return "iPod";
  if (/Macintosh/i.test(ua) && !android) return "Mac";
  if (/Windows/i.test(ua)) return "PC con Windows";
  if (/Linux/i.test(ua) && !android) return "PC con Linux";

  if (android) {
    const m = /Android[^;]*;\s*([^;)]+?)(?:\s+(?:Build|[A-Z]{2}-[A-Z]{2}))/i.exec(ua);
    const modelo = m?.[1]?.trim();
    if (modelo) {
      const limpio = modelo.replace(/[()]/g, "");
      return /^[A-Za-z]{2,}$/i.test(limpio)
        ? `Android ${limpio}`
        : limpio;
    }
    return "Android";
  }

  return "Dispositivo";
}

/** Etiqueta final: "iPhone de Jesús". */
export function etiquetaDispositivo(nombrePersona?: string | null): string {
  const dispositivo = nombreDispositivo();
  if (!nombrePersona) return dispositivo;
  const primero = nombrePersona.trim().split(" ")[0];
  return `${dispositivo} de ${primero}`;
}

/* ------------------------------------------------------------------ */
/* Vínculo local con la persona                                        */
/* ------------------------------------------------------------------ */

export function guardarVinculo(persona: VinculoPersona): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CLAVE_PERSONA, JSON.stringify(persona));
  } catch {
    /* sin localStorage no hay vínculo local */
  }
}

export function leerVinculo(): VinculoPersona | null {
  if (typeof window === "undefined") return null;
  try {
    const crudo = window.localStorage.getItem(CLAVE_PERSONA);
    if (!crudo) return null;
    const persona = JSON.parse(crudo) as VinculoPersona;
    return persona?.id ? persona : null;
  } catch {
    return null;
  }
}

export function olvidarVinculo(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CLAVE_PERSONA);
  } catch {
    /* nada que hacer */
  }
}
