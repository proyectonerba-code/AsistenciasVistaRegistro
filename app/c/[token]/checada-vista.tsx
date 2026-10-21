"use client";

/**
 * Vista de checada (client) — lee el token de la ruta /c/[token].
 *
 * Flujo:
 *  1. GET /api/checar/info?token=  → solo LECTURA (nombre, última marca).
 *  2. Pide geolocalización al navegador (timeout 20 s, alta precisión).
 *  3. POST /api/checar con { token, lat, lng, accuracy }.
 *  4. Si no hay ubicación, NO se envía nada: se pide permiso con un botón
 *     de reintento.
 *
 * Contrato esperado del backend:
 * - GET  /api/checar/info?token=<token>
 *       -> { valido, nombre?, area?, ultimaMarca?, tipoUltimaMarca? }
 * - POST /api/checar  body { token, lat, lng, accuracy }
 *       -> { ok: true, tipo: "ENTRADA"|"SALIDA", hora, nombre, sede?, distanciaM?, aviso? }
 *       -> { ok: false, error: { motivo, mensaje } }
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ChecadaDisplay, PieTerminal } from "@/components/ui/checada-display";
import { TerminalHeader } from "@/components/ui/terminal-header";

// Se recorta: una variable de entorno con espacios sobrantes rompería la URL.
const API_URL = (process.env.NEXT_PUBLIC_API_URL || "").trim();

/** Tiempo máximo para cada llamada al backend. */
const TIMEOUT_FETCH_MS = 15000;
/** Tiempo máximo para la geolocalización. */
const TIMEOUT_GEO_MS = 20000;

/**
 * Error de red con motivo distinguible: la terminal necesita saber si la
 * petición falló, se quedó colgada o la canceló el usuario.
 */
class ErrorDeRed extends Error {
  constructor(
    readonly motivo: "timeout" | "cancelado" | "sin-conexion",
    mensaje: string
  ) {
    super(mensaje);
    this.name = "ErrorDeRed";
  }
}

/**
 * `fetch` con tiempo máximo.
 *
 * Sin esto, si el backend no responde la terminal queda en un spinner eterno
 * sin salida posible. Aborta la petición al cumplirse el plazo y distingue
 * el timeout de una cancelación hecha por el usuario.
 */
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

type Estado =
  | "inicial"
  | "esperando"
  | "exito"
  | "error"
  | "sin-ubicacion";

interface InfoToken {
  valido: boolean;
  nombre?: string;
  area?: string;
  ultimaMarca?: string;
  tipoUltimaMarca?: "ENTRADA" | "SALIDA";
}

export interface ChecadaVistaProps {
  params: { token?: string } | Promise<{ token?: string }>;
}

export function ChecadaVista({ params }: ChecadaVistaProps): JSX.Element {
  const [token, setToken] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  const [estado, setEstado] = useState<Estado>("inicial");
  const [tipo, setTipo] = useState<"ENTRADA" | "SALIDA" | null>(null);
  const [hora, setHora] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [nombre, setNombre] = useState<string | null>(null);
  const [area, setArea] = useState<string | null>(null);
  const [ultimaMarca, setUltimaMarca] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [sede, setSede] = useState<string | null>(null);
  const [distanciaM, setDistanciaM] = useState<number | null>(null);

  // Evita doble envío si el efecto se re-dispara.
  const registrando = useRef(false);
  // Permite cancelar la checada en curso (deja la terminal libre).
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let vivo = true;
    void Promise.resolve(params).then((p) => {
      if (!vivo) return;
      setToken(p?.token ?? null);
      setListo(true);
    });
    return () => {
      vivo = false;
    };
  }, [params]);

  /** Obtiene la info pública del token. Solo lectura: nunca registra nada. */
  const fetchInfo = useCallback(
    async (senal?: AbortSignal): Promise<boolean> => {
      if (!token) {
        setMensaje("Falta el token de checada.");
        setEstado("error");
        return false;
      }
      if (!API_URL) {
        setMensaje("Configuración incompleta: falta NEXT_PUBLIC_API_URL.");
        setEstado("error");
        return false;
      }

      try {
        const res = await fetchConTimeout(
          `${API_URL}/api/checar/info?token=${encodeURIComponent(token)}`,
          { cache: "no-store" },
          TIMEOUT_FETCH_MS,
          senal
        );
        const json = (await res.json()) as InfoToken;

        if (!json?.valido || !json.nombre) {
          setMensaje("Token inválido o usuario inactivo.");
          setEstado("error");
          return false;
        }

        setNombre(json.nombre);
        setArea(json.area ?? null);
        setUltimaMarca(json.ultimaMarca ?? null);
        return true;
      } catch (err) {
        if (err instanceof ErrorDeRed && err.motivo === "cancelado") return false;
        setMensaje(
          err instanceof ErrorDeRed
            ? err.message
            : "No se pudo conectar con el servidor."
        );
        setEstado("error");
        return false;
      }
    },
    [token]
  );

  /** Solicita la ubicación del navegador. */
  const solicitarUbicacion = useCallback(
    (): Promise<GeolocationPosition> =>
      new Promise((resolve, reject) => {
        if (typeof navigator === "undefined" || !navigator.geolocation) {
          reject(new Error("El navegador no soporta geolocalización"));
          return;
        }
        const idTimeout = setTimeout(
          () => reject(new Error("Tiempo de espera agotado")),
          TIMEOUT_GEO_MS
        );
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(idTimeout);
            resolve(pos);
          },
          (err) => {
            clearTimeout(idTimeout);
            reject(err);
          },
          {
            enableHighAccuracy: true,
            timeout: TIMEOUT_GEO_MS,
            maximumAge: 0,
          }
        );
      }),
    []
  );

  /** Envía la checada al backend. */
  const enviarChecada = useCallback(
    async (
      lat: number,
      lng: number,
      accuracy: number,
      senal?: AbortSignal
    ) => {
      if (!token) return;
      try {
        const res = await fetchConTimeout(
          `${API_URL}/api/checar`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, lat, lng, accuracy }),
          },
          TIMEOUT_FETCH_MS,
          senal
        );

        // El backend puede responder con HTML si hay un error de plataforma:
        // en ese caso el JSON no se puede leer.
        let json: {
          ok?: boolean;
          tipo?: string;
          hora?: string;
          sede?: string | null;
          distanciaM?: number | null;
          aviso?: string | null;
          error?: { motivo?: string; mensaje?: string };
        };
        try {
          json = await res.json();
        } catch {
          setMensaje("El servidor devolvió una respuesta inválida.");
          setEstado("error");
          return;
        }

        if (json.ok && json.tipo && json.hora) {
          setTipo(json.tipo as "ENTRADA" | "SALIDA");
          setHora(json.hora);
          setSede(json.sede ?? null);
          setDistanciaM(
            typeof json.distanciaM === "number" ? json.distanciaM : null
          );
          setAviso(json.aviso ?? null);
          setEstado("exito");
        } else {
          const error = json.error ?? {};
          setMensaje(error.mensaje || "No se pudo registrar la checada");
          setEstado(
            error.motivo === "sin ubicacion" ? "sin-ubicacion" : "error"
          );
        }
      } catch (err) {
        if (err instanceof ErrorDeRed && err.motivo === "cancelado") return;
        setMensaje(
          err instanceof ErrorDeRed
            ? err.message
            : "No se pudo conectar con el servidor."
        );
        setEstado("error");
      }
    },
    [token]
  );

  /** Ejecuta el flujo completo: info → ubicación → checada. */
  const ejecutar = useCallback(async () => {
    if (registrando.current) return;
    registrando.current = true;
    setEstado("esperando");
    setMensaje(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const ok = await fetchInfo(controller.signal);
      if (!ok) return;
      if (controller.signal.aborted) return;

      try {
        const pos = await solicitarUbicacion();
        if (controller.signal.aborted) return;
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        await enviarChecada(lat, lng, accuracy, controller.signal);
      } catch {
        if (controller.signal.aborted) return;
        setMensaje("Activa tu ubicación para registrar");
        setEstado("sin-ubicacion");
      }
    } finally {
      registrando.current = false;
      abortRef.current = null;
    }
  }, [fetchInfo, solicitarUbicacion, enviarChecada]);

  /** Cancela la checada en curso y devuelve la terminal a la pantalla de reposo. */
  const cancelar = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    registrando.current = false;
    setEstado("inicial");
    setTipo(null);
    setHora(null);
    setMensaje(null);
    setAviso(null);
    window.location.href = "/";
  }, []);

  useEffect(() => {
    if (!listo || !token) return;
    void ejecutar();
  }, [listo, token, ejecutar]);

  /* ---------------------------------------------------------------- */
  /* Estados sin token                                                 */
  /* ---------------------------------------------------------------- */
  if (!listo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <p className="text-sm text-ink-muted">Cargando…</p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex min-h-screen flex-col bg-canvas">
        <TerminalHeader estado="inactivo" etiqueta="Terminal sin enlace" />
        <main className="flex flex-1 items-center justify-center p-6">
          <div className="u-card w-full max-w-md p-8 text-center">
            <h1 className="u-display text-xl font-bold text-ink">
              Enlace de checada incompleto
            </h1>
            <p className="mt-3 text-sm text-ink-muted">
              Esta dirección requiere un token válido. Escanea de nuevo tu
              credencial NFC o QR.
            </p>
          </div>
        </main>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Vista principal                                                   */
  /* ---------------------------------------------------------------- */
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <TerminalHeader />

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-lg">
          <ChecadaDisplay
            estado={estado}
            nombre={nombre ?? undefined}
            area={area ?? undefined}
            ultimaMarca={ultimaMarca ?? undefined}
            tipo={tipo ?? undefined}
            hora={hora ?? undefined}
            mensaje={mensaje ?? undefined}
            aviso={aviso}
            sede={sede}
            distanciaM={distanciaM}
            onReintentar={() => {
              void ejecutar();
            }}
            onCancelar={cancelar}
            onAceptar={() => {
              // La terminal queda lista para la siguiente credencial.
              setEstado("inicial");
              setTipo(null);
              setHora(null);
              setMensaje(null);
              setAviso(null);
              window.location.href = "/";
            }}
          />
          <PieTerminal />
        </div>
      </main>
    </div>
  );
}
