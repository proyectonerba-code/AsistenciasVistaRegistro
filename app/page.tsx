"use client";

/**
 * Pantalla principal de checada — flujo simple y directo.
 *
 * Flujo:
 *  1. Al entrar, pide ubicación del navegador.
 *  2. Obtiene la huella del dispositivo (celular).
 *  3. Consulta al backend si ese dispositivo ya está asociado a un nombre.
 *  4. Si está asociado → muestra el nombre y permite checar entrada/salida.
 *  5. Si NO está asociado → muestra "No asociado, pregunta en administración".
 *  6. Solo permite registrar si está dentro de la geocerca fija.
 *
 * Geocerca fija: 20°04'22.6"N 98°23'06.9"W  ->  20.0729444, -98.38525
 * Radio: 150 metros.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Logo } from "@/components/ui/logo";
import { etiquetaDispositivo, obtenerHuella } from "@/lib/dispositivo";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

/** Geocerca fija: Oficina Central */
const GEOCERCA_LAT = 20.0729444; // 20°04'22.6"N
const GEOCERCA_LNG = -98.38525; // 98°23'06.9"W
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

/** Calcula distancia Haversine en metros entre dos puntos. */
function haversineMetros(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // radio de la Tierra en metros
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
  | "pedir-ubicacion"
  | "asociado"
  | "no-asociado"
  | "checando"
  | "exito"
  | "error";

interface UsuarioAsociado {
  id: string;
  nombre: string;
  correo: string;
  area: string;
}

export default function HomePage(): JSX.Element {
  const [estado, setEstado] = useState<Estado>("iniciando");
  const [huella, setHuella] = useState("");
  const [usuario, setUsuario] = useState<UsuarioAsociado | null>(null);
  const [tipo, setTipo] = useState<"ENTRADA" | "SALIDA" | null>(null);
  const [hora, setHora] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [distanciaM, setDistanciaM] = useState<number | null>(null);
  const [cargando, setCargando] = useState(false);
  const [ubicacion, setUbicacion] = useState<{ lat: number; lng: number } | null>(null);

  const registrando = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  /** Pide la ubicación del navegador. */
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

  /** Consulta si el dispositivo está asociado a un usuario. */
  const consultarDispositivo = useCallback(async () => {
    try {
      const res = await fetchConTimeout(
        `${API_URL}/api/dispositivo?huella=${encodeURIComponent(huella)}`,
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
  }, [huella]);

  /** Envía la checada al backend. */
  const enviarChecada = useCallback(async () => {
    if (!usuario || !ubicacion) return;
    if (registrando.current) return;
    registrando.current = true;

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setEstado("checando");
      setMensaje(null);

      const { lat, lng } = ubicacion;

      // Verificar geocerca antes de enviar
      const d = haversineMetros(lat, lng, GEOCERCA_LAT, GEOCERCA_LNG);
      setDistanciaM(d);

      if (d > GEOCERCA_RADIO_M) {
        setMensaje(
          `Estás a ${Math.round(d)} m de la oficina. Solo puedes registrarte dentro de los 150 m de la sede.`
        );
        setEstado("error");
        return;
      }

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
      setCargando(false);
    }
  }, [usuario, ubicacion, huella]);

  useEffect(() => {
    let vivo = true;

    (async () => {
      const h = obtenerHuella();
      if (!vivo) return;
      setHuella(h);

      // Pedir ubicación
      try {
        const pos = await solicitarUbicacion();
        setUbicacion({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      } catch {
        // Si no da ubicación, mostramos error pero igual consultamos dispositivo
        setUbicacion(null);
      }

      if (!vivo) return;
      await consultarDispositivo();
    })();

    return () => {
      vivo = false;
    };
  }, [solicitarUbicacion, consultarDispositivo]);

  /* ---------------------------------------------------------------- */
  /* Render                                                             */
  /* ---------------------------------------------------------------- */

  if (estado === "iniciando") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary mx-auto mb-4" />
          <p className="text-sm text-ink-muted">Cargando…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="u-glass sticky top-0 z-20 border-b border-black/5">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo height={26} />
          <div className="flex items-center gap-3">
            <span className="u-badge u-badge-success">
              <span className="u-dot" /> Sistema activo
            </span>
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-lg">

          {/* --- No asociado --- */}
          {estado === "no-asociado" && (
            <div className="u-card p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600 mb-6">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4" />
                  <path d="M12 16h.01" />
                </svg>
              </div>

              <h1 className="u-display text-2xl font-bold text-ink mb-2">
                No asociado
              </h1>
              <p className="text-sm text-ink-muted mb-6">
                Este celular aún no está registrado en el sistema.
              </p>
              <p className="text-base font-semibold text-primary mb-8">
                Pregunta en administración para que te asocien a un nombre.
              </p>

              <div className="u-card p-4 bg-surface-muted text-center">
                <p className="text-xs text-ink-subtle mb-3">
                  Información del dispositivo:
                </p>
                <p className="u-mono text-xs text-ink-muted truncate" title={huella}>
                  {huella.slice(0, 12)}…
                </p>
              </div>
            </div>
          )}

          {/* --- Asociado: mostrar nombre y checar --- */}
          {estado === "asociado" && usuario && (
            <div className="u-card p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-6">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="18" y1="8" x2="23" y2="13" />
                  <line x1="18" y1="13" x2="23" y2="8" />
                </svg>
              </div>

              <h1 className="u-display text-2xl font-bold text-ink mb-1">
                Hola, {usuario.nombre}
              </h1>
              <p className="text-sm text-ink-muted mb-2">{usuario.area}</p>
              <p className="u-mono text-xs text-ink-subtle mb-6">
                {usuario.correo}
              </p>

              {/* Estado de ubicación / geocerca */}
              {ubicacion && (
                <div className="mb-6 p-3 rounded-lg border border-line bg-surface">
                  <p className="text-xs font-medium text-ink-muted mb-1">
                    Ubicación detectada
                  </p>
                  <p className="u-mono text-xs text-ink">
                    {ubicacion.lat.toFixed(6)}, {ubicacion.lng.toFixed(6)}
                  </p>
                  {distanciaM !== null && (
                    <p className="text-xs text-ink-muted mt-1">
                      A {Math.round(distanciaM)} m de la oficina
                    </p>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={enviarChecada}
                disabled={cargando || !ubicacion}
                className={`u-btn w-full mb-3 ${
                  cargando || !ubicacion
                    ? "u-btn-secondary opacity-50 cursor-not-allowed"
                    : "u-btn-primary"
                }`}
              >
                {cargando ? "Registrando…" : !ubicacion ? "Esperando ubicación…" : "Registrar entrada / salida"}
              </button>

              <p className="text-xs text-ink-subtle">
                Solo puedes registrarte dentro de los 150 m de la oficina.
              </p>
            </div>
          )}

          {/* --- Checando / Procesando --- */}
          {estado === "checando" && (
            <div className="u-card p-8 text-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary mx-auto mb-4" />
              <p className="text-sm text-ink-muted">Registrando tu asistencia…</p>
              {usuario && <p className="text-xs text-ink-subtle mt-2">{usuario.nombre}</p>}
            </div>
          )}

          {/* --- Éxito --- */}
          {estado === "exito" && tipo && hora && (
            <div className="u-card p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-6">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>

              <h1 className="u-display text-2xl font-bold text-ink mb-2">
                ¡Registro exitoso!
              </h1>
              <p className="text-sm text-ink-muted mb-4">
                Hola, {usuario?.nombre}
              </p>
              <div className="rounded-lg bg-surface-muted px-4 py-3 mb-6">
                <p className="text-base font-semibold text-emerald-700">
                  {tipo === "SALIDA" ? "Salida" : "Entrada"} registrada a las{" "}
                  <span className="u-mono tnum">{hora}</span> hrs
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEstado("asociado");
                  setTipo(null);
                  setHora(null);
                  setMensaje(null);
                }}
                className="u-btn u-btn-primary w-full"
              >
                Volver
              </button>
            </div>
          )}

          {/* --- Error --- */}
          {estado === "error" && mensaje && (
            <div className="u-card p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-wash text-primary mb-6">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4" />
                  <path d="M12 16h.01" />
                </svg>
              </div>

              <h1 className="u-display text-xl font-bold text-ink mb-2">
                No se pudo registrar
              </h1>
              <p className="text-sm text-ink-muted mb-6">{mensaje}</p>

              <button
                type="button"
                onClick={() => {
                  setEstado("asociado");
                  setMensaje(null);
                }}
                className="u-btn u-btn-primary w-full"
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
