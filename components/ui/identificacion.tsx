"use client";

/**
 * Formulario de identificación para la terminal compartida.
 *
 * El flujo pide el CORREO (identificador único en la base). Si no lo
 * reconoce, el usuario puede escribir su NOMBRE: si hay una sola coincidencia
 * se resuelve sola; si hay varias, se muestra una lista para elegir.
 */
import { useState } from "react";

export interface Candidato {
  id: string;
  nombre: string;
  correo: string;
  area: string;
}

export interface IdentificacionProps {
  onIdentificar: (datos: { correo?: string; nombre?: string; id?: string }) => Promise<void>;
  cargando: boolean;
  error?: string | null;
  candidatos?: Candidato[];
  onElegirCandidato?: (candidato: Candidato) => void;
}

export function Identificacion({
  onIdentificar,
  cargando,
  error,
  candidatos = [],
  onElegirCandidato,
}: IdentificacionProps): JSX.Element {
  const [modo, setModo] = useState<"correo" | "nombre">("correo");
  const [correo, setCorreo] = useState("");
  const [nombre, setNombre] = useState("");

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modo === "correo") {
      if (!correo.trim()) return;
      await onIdentificar({ correo: correo.trim() });
    } else {
      if (!nombre.trim()) return;
      await onIdentificar({ nombre: nombre.trim() });
    }
  };

  /* --- Hay varios con el mismo nombre: se elige de la lista --- */
  if (candidatos.length > 0 && onElegirCandidato) {
    return (
      <div className="w-full max-w-lg">
        <div className="u-hero bg-white/95 p-7 sm:p-8">
          <h2 className="u-display text-xl font-bold text-ink">
            Hay más de una persona con ese nombre
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            Elige cuál eres para registrar tu asistencia.
          </p>

          <ul className="mt-5 space-y-2">
            {candidatos.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onElegirCandidato(c)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-left transition hover:border-primary hover:bg-primary-soft"
                >
                  <span>
                    <span className="block font-semibold text-ink">
                      {c.nombre}
                    </span>
                    <span className="block text-xs text-ink-muted">
                      {c.correo}
                    </span>
                  </span>
                  <span className="u-badge u-badge-neutral">{c.area}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg">
      <div className="u-hero bg-white/95 p-7 sm:p-8">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-wash text-primary">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </span>

        <h2 className="u-display mt-5 text-center text-xl font-bold text-ink">
          Identifícate para registrar
        </h2>
        <p className="mt-2 text-center text-sm text-ink-muted">
          Tu dispositivo se recordará: la próxima vez solo acercas la tarjeta.
        </p>

        <form onSubmit={enviar} className="mt-6 space-y-4">
          <div className="flex rounded-lg bg-surface-muted p-1">
            <button
              type="button"
              onClick={() => setModo("correo")}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
                modo === "correo"
                  ? "bg-surface text-ink shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              Correo
            </button>
            <button
              type="button"
              onClick={() => setModo("nombre")}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
                modo === "nombre"
                  ? "bg-surface text-ink shadow-sm"
                  : "text-ink-muted hover:text-ink"
              }`}
            >
              Nombre
            </button>
          </div>

          {modo === "correo" ? (
            <div>
              <label
                htmlFor="id-correo"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                Correo electrónico
              </label>
              <input
                id="id-correo"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="nombre@correo.com"
                className="u-input"
                autoFocus
              />
            </div>
          ) : (
            <div>
              <label
                htmlFor="id-nombre"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                Nombre completo
              </label>
              <input
                id="id-nombre"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Como aparece en tu credencial"
                className="u-input"
                autoFocus
              />
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-primary/20 bg-primary-wash px-3.5 py-2.5 text-sm font-medium text-primary"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="u-btn u-btn-primary w-full"
          >
            {cargando ? "Verificando…" : "Continuar"}
          </button>
        </form>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-ink-subtle">
          Verificamos que tu registro esté activo antes de guardar la
          asistencia. Después te avisaremos de la hora registrada.
        </p>
      </div>
    </div>
  );
}
