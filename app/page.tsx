"use client";

/**
 * Pantalla principal de checada — flujo automático.
 *
 * Flujo:
 *  1. Al entrar se detecta la huella del dispositivo y la ubicación del navegador.
 *  2. Se consulta al backend si el dispositivo ya está asociado a un colaborador.
 *  3. Si NO está asociado → "No asociado, comunícate con administración".
 *  4. Si está asociado y hay ubicación válida → se registra la entrada/salida
 *     automáticamente (sin botones). Resultado: nombre, hora y "Ya puedes cerrar
 *     la ventana".
 *  5. Si la ubicación está fuera de la geocerca (o no se obtuvo) → no se
 *     registra nada.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Logo } from "@/components/ui/logo";
import { etiquetaDispositivo, obtenerHuella } from "@/lib/dispositivo";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

/** Geocerca fija: Oficina Central */
const GEOCERCA_LAT = 20.0729444;
const GEOCERCA_LNG = -98.38525;
const GEOCERCA_RADIO_M = 150;

const TIMEOUT_FETCH_MS = 15000;
const TIMEOUT_GEO_MS = 20000;

class ErrorDeRed extends Error {
  constructor(readonly motivo: "timeout" | "cancelado" | "sin-conexion", mensaje: string) {
    super(mensaje);
    this.name = "ErrorDeRed";
  }
}

async function fetchConTimeout(
  url: string,
  init: RequestInit,
  ms: number,
  senalExterna?: AbortSignal
): Promise<Response> {
  const controller = new AbortController();
  const idTimeout = setTimeout(() => controller.abort(), ms);
  const alAbortar = () => controller.abort();
  senalExterna?.addEventListener("abort", alAbortar);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (senalExterna?.aborted) {
      throw new ErrorDeRed("cancelado", "Checada cancelada");
    }
    if (controller.signal.aborted) {
      throw new ErrorDeRed("timeout", "El servidor no respondió a tiempo.");
    }
    throw new ErrorDeRed("sin-conexion", "No se pudo conectar con el servidor.");
  } finally {
    clearTimeout(idTimeout);
    senalExterna?.removeEventListener("abort", alAbortar);
  }
}

function haversineMetros(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

type Estado =
  | "iniciando"
  | "asociado"
  | "registrando"
  | "exito"
  | "no-asociado"
  | "sin-ubicacion"
  | "error";

interface UsuarioAsociado {
  id: string;
  nombre: string;
  correo: string;
  area: string;
}

function formatoHora(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export default function HomePage(): JSX.Element {
  const [estado, setEstado] = useState<Estado>("iniciando");
  const [huella, setHuella] = useState("");
  const [usuario, setUsuario] = useState<UsuarioAsociado | null>(null);
  const [tipo, setTipo] = useState<"ENTRADA" | "SALIDA" | null>(null);
  const [hora, setHora] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [distanciaM, setDistanciaM] = useState<number | null>(null);
  const [ubicacion, setUbicacion] = useState<{ lat: number; lng: number } | null>(null);
  const [reloj, setReloj] = useState(new Date());

  const registrando = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const yaRegistro = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setReloj(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const solicitarUbicacion = useCallback(
    (): Promise<GeolocationPosition> =>
      new Promise((resolve, reject) => {
        if (typeof navigator === "undefined" || !navigator.geolocation) {
          reject(new Error("El navegador no soporta geolocalización"));
          return;
        }
        const id = setTimeout(
          () => reject(new Error("Tiempo de espera agotado")),
          TIMEOUT_GEO_MS
        );
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(id);
            resolve(pos);
          },
          (err) => {
            clearTimeout(id);
            reject(err);
          },
          { enableHighAccuracy: true, timeout: TIMEOUT_GEO_MS, maximumAge: 0 }
        );
      }),
    []
  );

  const consultarDispositivo = useCallback(async (h: string) => {
    try {
      const res = await fetchConTimeout(
        `${API_URL}/api/dispositivo?huella=${encodeURIComponent(h)}`,
        { cache: "no-store" },
        TIMEOUT_FETCH_MS
      );
      const json = await res.json();

      if (json.encontrado && json.usuarioId && json.nombre) {
        setUsuario({
          id: json.usuarioId,
          nombre: json.nombre,
          correo: json.correo ?? "",
          area: json.area ?? "Sin asignar",
        });
        setEstado("asociado");
      } else {
        setEstado("no-asociado");
      }
    } catch {
      setEstado("no-asociado");
    }
  }, []);

  const enviarChecada = useCallback(async () => {
    if (!usuario || yaRegistro.current) return;
    if (registrando.current) return;
    registrando.current = true;

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      if (!ubicacion) {
        setMensaje("Activa tu ubicación para registrar la asistencia.");
        setEstado("sin-ubicacion");
        return;
      }

      const { lat, lng } = ubicacion;
      const d = haversineMetros(lat, lng, GEOCERCA_LAT, GEOCERCA_LNG);
      setDistanciaM(d);

      if (d > GEOCERCA_RADIO_M) {
        setMensaje(
          `Estás a ${Math.round(d)} m de la oficina. Solo puedes registrar dentro de los ${GEOCERCA_RADIO_M} m de la sede.`
        );
        setEstado("error");
        return;
      }

      setEstado("registrando");
      setMensaje(null);

      const etiqueta = etiquetaDispositivo(usuario.nombre);

      const res = await fetchConTimeout(
        `${API_URL}/api/checar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dispositivo: huella,
            lat,
            lng,
            accuracy: 0,
            etiqueta,
          }),
        },
        TIMEOUT_FETCH_MS,
        controller.signal
      );

      const json = await res.json();

      if (json.ok && json.tipo && json.hora) {
        yaRegistro.current = true;
        setTipo(json.tipo as "ENTRADA" | "SALIDA");
        setHora(json.hora);
        setEstado("exito");
      } else {
        const error = json.error ?? {};
        setMensaje(error.mensaje || "No se pudo registrar la checada");
        setEstado("error");
      }
    } catch (err) {
      if (err instanceof ErrorDeRed && err.motivo === "cancelado") return;
      setMensaje(
        err instanceof ErrorDeRed ? err.message : "No se pudo conectar con el servidor."
      );
      setEstado("error");
    } finally {
      registrando.current = false;
      abortRef.current = null;
    }
  }, [usuario, ubicacion, huella]);

  // Auto-registro cuando el dispositivo está asociado y ya tenemos ubicación.
  useEffect(() => {
    if (estado === "asociado" && usuario && ubicacion && !yaRegistro.current) {
      void enviarChecada();
    }
  }, [estado, usuario, ubicacion, enviarChecada]);

  useEffect(() => {
    let vivo = true;

    (async () => {
      const h = obtenerHuella();
      if (!vivo) return;
      setHuella(h);

      try {
        const pos = await solicitarUbicacion();
        if (!vivo) return;
        setUbicacion({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } catch {
        if (!vivo) return;
        setUbicacion(null);
      }

      if (!vivo) return;
      await consultarDispositivo(h);
    })();

    return () => {
      vivo = false;
    };
  }, [solicitarUbicacion, consultarDispositivo]);

  /* ------------------------------ Render ------------------------------ */

  if (estado === "iniciando") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <p className="text-sm text-ink-muted">Cargando…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      {/* Header estilo stitch */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-12">
          <div className="flex items-center gap-3">
            <Logo height={32} />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Terminal activa
            </div>
            <div className="font-mono text-base font-bold tracking-tight text-ink">
              {formatoHora(reloj)}
            </div>
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pt-20 pb-10 sm:px-8">
        <div className="w-full max-w-xl">
          {/* --- No asociado --- */}
          {estado === "no-asociado" && (
            <div className="rounded-xl bg-surface p-6 text-center shadow-xl sm:p-8">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4" />
                  <path d="M12 16h.01" />
                </svg>
              </div>
              <h1 className="font-jakarta text-2xl font-bold tracking-tight text-ink">
                No asociado
              </h1>
              <p className="mt-2 text-sm text-ink-muted">
                Este dispositivo aún no está vinculado a un colaborador.
              </p>
              <p className="mt-6 text-base font-semibold text-primary">
                Comunícate con administración para que te asocien a un nombre.
              </p>

              <div className="mt-8 rounded-lg bg-surface-muted p-4 text-center">
                <p className="mb-2 text-xs text-ink-subtle">Información del dispositivo</p>
                <p className="u-mono truncate text-xs text-ink-muted" title={huella}>
                  {huella.slice(0, 16)}…
                </p>
              </div>
            </div>
          )}

          {/* --- Asociado / registrando --- */}
          {(estado === "asociado" || estado === "registrando") && usuario && (
            <div className="rounded-xl bg-surface p-6 text-center shadow-xl sm:p-8">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                </svg>
              </div>
              <h1 className="font-jakarta text-2xl font-bold tracking-tight text-ink">
                Hola, {usuario.nombre}
              </h1>
              <p className="text-sm text-ink-muted">{usuario.area}</p>
              <p className="u-mono mt-1 text-xs text-ink-subtle">{usuario.correo}</p>

              <div className="my-6 rounded-lg bg-surface-muted py-4 px-6">
                <p className="text-sm font-semibold text-ink-muted">
                  {estado === "registrando" ? "Registrando tu asistencia…" : "Preparando registro…"}
                </p>
                <div className="mx-auto mt-3 h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
              </div>

              {ubicacion && (
                <div className="mb-4 rounded-lg border border-line bg-surface p-3">
                  <p className="mb-1 text-xs font-medium text-ink-muted">Ubicación detectada</p>
                  <p className="u-mono text-xs text-ink">
                    {ubicacion.lat.toFixed(6)}, {ubicacion.lng.toFixed(6)}
                  </p>
                  {distanciaM !== null && (
                    <p className="mt-1 text-xs text-ink-muted">
                      A {Math.round(distanciaM)} m de la oficina
                    </p>
                  )}
                </div>
              )}

              {!ubicacion && (
                <p className="text-xs text-ink-subtle">
                  No se pudo obtener la ubicación. Activa el GPS y recarga la página.
                </p>
              )}
            </div>
          )}

          {/* --- Éxito --- */}
          {estado === "exito" && tipo && hora && (
            <div className="rounded-xl bg-surface p-6 text-center shadow-xl sm:p-8">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <h1 className="font-jakarta text-2xl font-bold tracking-tight text-ink">
                ¡Registro exitoso!
              </h1>
              <p className="mt-2 text-sm text-ink-muted">Hola, {usuario?.nombre}</p>
              <div className="my-6 rounded-lg bg-surface-muted px-4 py-3">
                <p className="text-base font-semibold text-emerald-700">
                  {tipo === "SALIDA" ? "Salida" : "Entrada"} registrada a las{" "}
                  <span className="u-mono tnum">{hora}</span> hrs
                </p>
              </div>
              <p className="text-base font-bold text-primary">
                Ya puedes cerrar la ventana.
              </p>
            </div>
          )}

          {/* --- Sin ubicación --- */}
          {estado === "sin-ubicacion" && (
            <div className="rounded-xl bg-surface p-6 text-center shadow-xl sm:p-8">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4" />
                  <path d="M12 16h.01" />
                </svg>
              </div>
              <h1 className="font-jakarta text-xl font-bold tracking-tight text-ink">
                Ubicación requerida
              </h1>
              <p className="mt-2 text-sm text-ink-muted">
                {mensaje ?? "Activa tu ubicación para registrar la asistencia."}
              </p>
              <button
                type="button"
                onClick={() => {
                  setEstado("asociado");
                  setMensaje(null);
                }}
                className="u-btn u-btn-primary mt-6 w-full"
              >
                Reintentar
              </button>
            </div>
          )}

          {/* --- Error --- */}
          {estado === "error" && mensaje && (
            <div className="rounded-xl bg-surface p-6 text-center shadow-xl sm:p-8">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary-wash text-primary">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4" />
                  <path d="M12 16h.01" />
                </svg>
              </div>
              <h1 className="font-jakarta text-xl font-bold tracking-tight text-ink">
                No se pudo registrar
              </h1>
              <p className="mt-2 text-sm text-ink-muted">{mensaje}</p>
              <button
                type="button"
                onClick={() => {
                  if (usuario) {
                    setEstado("asociado");
                    setMensaje(null);
                  } else {
                    window.location.reload();
                  }
                }}
                className="u-btn u-btn-primary mt-6 w-full"
              >
                Intentar de nuevo
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
