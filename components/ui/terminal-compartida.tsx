"use client";

/**
 * Terminal compartida: la etiqueta NFC/QR apunta a /c (sin token).
 *
 * Ciclo:
 *   1. Se obtiene la huella del dispositivo.
 *   2. Si el dispositivo ya está vinculado a alguien -> checada directa.
 *   3. Si no -> se pide correo (o nombre) y se valida contra la base.
 *      El backend devuelve una SESIÓN de 5 minutos que autoriza una checada.
 *   4. Se guarda el vínculo local y se registra la asistencia.
 */

import { useCallback, useEffect, useState } from "react";
import { ChecadaDisplay, PieTerminal } from "@/components/ui/checada-display";
import { TerminalHeader } from "@/components/ui/terminal-header";
import { Identificacion, type Candidato } from "@/components/ui/identificacion";
import {
  etiquetaDispositivo,
  guardarVinculo,
  leerVinculo,
  obtenerHuella,
} from "@/lib/dispositivo";

const API_URL = (process.env.NEXT_PUBLIC_API_URL || "").trim();

/** Tiempo máximo para cada llamada al backend. */
const TIMEOUT_FETCH_MS = 15000;

/**
 * `fetch` con tiempo máximo: si el backend no responde, la terminal no se
 * queda colgada en un spinner eterno.
 */
async function fetchConTimeout(
  url: string,
  init: RequestInit,
  ms: number
): Promise<Response> {
  const controller = new AbortController();
  const idTimeout = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(idTimeout);
  }
}

type Estado =
  | "iniciando"
  | "identificar"
  | "candidatos"
  | "esperando"
  | "exito"
  | "error";

interface Persona {
  id: string;
  nombre: string;
  correo: string;
  area: string;
}

export function TerminalCompartida(): JSX.Element {
  const [estado, setEstado] = useState<Estado>("iniciando");
  const [huella, setHuella] = useState("");
  const [nombre, setNombre] = useState<string | undefined>();
  const [area, setArea] = useState<string | undefined>();
  const [tipo, setTipo] = useState<"ENTRADA" | "SALIDA" | undefined>();
  const [hora, setHora] = useState<string | undefined>();
  const [mensaje, setMensaje] = useState<string | undefined | null>(undefined);
  const [aviso, setAviso] = useState<string | null>(null);
  const [sede, setSede] = useState<string | null>(null);
  const [distanciaM, setDistanciaM] = useState<number | null>(null);
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [identificando, setIdentificando] = useState(false);
  const [errorId, setErrorId] = useState<string | null>(null);

  const iniRef = useCallback(() => {
    const h = obtenerHuella();
    setHuella(h);
    const vinculo = leerVinculo();
    if (vinculo) {
      setNombre(vinculo.nombre);
      setArea(vinculo.area);
    }
    setEstado("iniciando");
  }, []);

  useEffect(() => {
    iniRef();
  }, [iniRef]);

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
          20000
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
          { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
        );
      }),
    []
  );

  /** Envía la checada. `sesion` es opcional si el dispositivo ya está ligado. */
  const enviarChecada = useCallback(
    async (opciones: { sesion?: string; persona?: Persona }) => {
      setEstado("esperando");
      setMensaje(null);

      const etiqueta = etiquetaDispositivo(
        opciones.persona?.nombre ?? nombre ?? null
      );

      try {
        const pos = await solicitarUbicacion();
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;

        const res = await fetchConTimeout(
          `${API_URL}/api/checar`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...(opciones.sesion ? { sesion: opciones.sesion } : {}),
              ...(opciones.persona ? {} : { dispositivo: huella }),
              lat,
              lng,
              accuracy,
              dispositivo: huella,
              etiqueta,
            }),
          },
          TIMEOUT_FETCH_MS
        );

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
          return;
        }

        const error = json.error ?? {};
        setMensaje(error.mensaje || "No se pudo registrar la checada");

        if (error.motivo === "token invalido" && !opciones.sesion) {
          // El dispositivo no está registrado: hay que identificarse.
          setEstado("identificar");
          setErrorId(null);
          return;
        }

        setEstado("error");
      } catch {
        setMensaje("Activa tu ubicación para registrar");
        setEstado("error");
      }
    },
    [huella, nombre, solicitarUbicacion]
  );

  /**
   * Primer intento: si el dispositivo ya está ligado en la base, la
   * checada es directa (sin pedir identidad).
   */
  useEffect(() => {
    if (!huella || estado !== "iniciando") return;

    let cancelado = false;

    (async () => {
      try {
        const res = await fetchConTimeout(
          `${API_URL}/api/dispositivo?huella=${encodeURIComponent(huella)}`,
          { cache: "no-store" },
          TIMEOUT_FETCH_MS
        );
        const json = await res.json();

        if (cancelado) return;

        if (json.encontrado) {
          setNombre(json.nombre ?? undefined);
          setArea(json.area ?? undefined);
          await enviarChecada({});
        } else {
          setEstado("identificar");
        }
      } catch {
        if (!cancelado) setEstado("identificar");
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [huella, estado, enviarChecada]);

  /** Identificación por correo o nombre. */
  const identificar = useCallback(
    async (datos: { correo?: string; nombre?: string; id?: string }) => {
      setIdentificando(true);
      setErrorId(null);

      try {
        const res = await fetchConTimeout(
          `${API_URL}/api/identificar`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datos),
          },
          TIMEOUT_FETCH_MS
        );

        const json = await res.json();

        if (json.ok && json.sesion && json.usuario) {
          const persona = json.usuario as Persona;
          guardarVinculo({
            id: persona.id,
            nombre: persona.nombre,
            area: persona.area,
          });
          setNombre(persona.nombre);
          setArea(persona.area);
          await enviarChecada({ sesion: json.sesion, persona });
          return;
        }

        const error = json.error ?? {};
        if (error.motivo === "varios" && error.candidatos) {
          setCandidatos(error.candidatos as Candidato[]);
          setEstado("candidatos");
        } else {
          setErrorId(error.mensaje || "No te reconocimos. Revisa tus datos.");
        }
      } catch {
        setErrorId("No se pudo conectar con el servidor.");
      } finally {
        setIdentificando(false);
      }
    },
    [enviarChecada]
  );

  const elegirCandidato = useCallback(
    (candidato: Candidato) => {
      setCandidatos([]);
      void identificar({ id: candidato.id });
    },
    [identificar]
  );

  /* ---------------------------------------------------------------- */
  /* Render                                                             */
  /* ---------------------------------------------------------------- */

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <TerminalHeader />

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-lg">
          {estado === "iniciando" && (
            <div className="flex flex-col items-center gap-4">
              <span className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
              <p className="text-sm text-ink-muted">
                Verificando tu dispositivo…
              </p>
            </div>
          )}

          {(estado === "identificar" || estado === "candidatos") && (
            <Identificacion
              onIdentificar={identificar}
              cargando={identificando}
              error={errorId}
              candidatos={estado === "candidatos" ? candidatos : []}
              onElegirCandidato={elegirCandidato}
            />
          )}

          {(estado === "esperando" || estado === "exito" || estado === "error") && (
            <ChecadaDisplay
              estado={estado === "esperando" ? "esperando" : estado}
              nombre={nombre}
              area={area}
              tipo={tipo}
              hora={hora}
              mensaje={mensaje}
              aviso={aviso}
              sede={sede}
              distanciaM={distanciaM}
              onReintentar={() => {
                if (estado === "error") {
                  setEstado("iniciando");
                  setMensaje(null);
                }
              }}
              onAceptar={() => {
                // Vuelve al reposo, lista para la siguiente persona.
                setEstado("iniciando");
                setTipo(undefined);
                setHora(undefined);
                setMensaje(null);
                setAviso(null);
              }}
            />
          )}

          <PieTerminal />
        </div>
      </main>
    </div>
  );
}
