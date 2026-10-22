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
import { etiquetaDispositivo, obtenerHuella } from "@/lib/dispositivo";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

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
  const fetchInfo = useCallback(async (): Promise<boolean> => {
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
      const res = await fetch(
        `${API_URL}/api/checar/info?token=${encodeURIComponent(token)}`,
        { cache: "no-store" }
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
    } catch {
      setMensaje("No se pudo conectar con el servidor.");
      setEstado("error");
      return false;
    }
  }, [token]);

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
          20000
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
          { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
        );
      }),
    []
  );

  /** Envía la checada al backend. */
  const enviarChecada = useCallback(
    async (lat: number, lng: number, accuracy: number) => {
      if (!token) return;
      try {
        const res = await fetch(`${API_URL}/api/checar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            lat,
            lng,
            accuracy,
            dispositivo: obtenerHuella(),
            etiqueta: etiquetaDispositivo(nombre),
          }),
        });
        const json = await res.json();

        if (json.ok && json.tipo && json.hora) {
          setTipo(json.tipo);
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
      } catch {
        setMensaje("No se pudo conectar con el servidor.");
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

    try {
      const ok = await fetchInfo();
      if (!ok) return;

      try {
        const pos = await solicitarUbicacion();
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        await enviarChecada(lat, lng, accuracy);
      } catch {
        setMensaje("Activa tu ubicación para registrar");
        setEstado("sin-ubicacion");
      }
    } finally {
      registrando.current = false;
    }
  }, [fetchInfo, solicitarUbicacion, enviarChecada]);

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
