/**
 * Componente de presentación puro: muestra el resultado de una checada.
 * Recibe datos por props; no contiene lógica de negocio.
 */
import { Logo } from "./logo";

export type EstadoChecada =
  | "inicial"
  | "esperando"
  | "exito"
  | "error"
  | "sin-ubicacion";

export interface ChecadaDisplayProps {
  estado: EstadoChecada;
  nombre?: string;
  area?: string;
  ultimaMarca?: string;
  tipo?: "ENTRADA" | "SALIDA";
  hora?: string;
  mensaje?: string | null;
  aviso?: string | null;
  distanciaM?: number | null;
  sede?: string | null;
  onReintentar: () => void;
  onAceptar?: () => void;
  /** Cancela la checada en curso y deja la terminal lista de nuevo. */
  onCancelar?: () => void;
}

function IconoCheck({ className = "" }: { className?: string }): JSX.Element {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function IconoAlerta({ className = "" }: { className?: string }): JSX.Element {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    </svg>
  );
}

export function ChecadaDisplay({
  estado,
  nombre,
  area,
  ultimaMarca,
  tipo,
  hora,
  mensaje,
  aviso,
  distanciaM,
  sede,
  onReintentar,
  onAceptar,
  onCancelar,
}: ChecadaDisplayProps): JSX.Element {
  const esExito = estado === "exito";
  const esError = estado === "error" || estado === "sin-ubicacion";

  /* ---------------------------------------------------------------- */
  /* Resultado exitoso: la "ventana de registro"                       */
  /* ---------------------------------------------------------------- */
  if (esExito) {
    return (
      <div className="w-full max-w-lg animate-scale-in">
        <div className="u-hero bg-white/95 p-7 text-center sm:p-9">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <IconoCheck />
          </span>

          <h2 className="u-display mt-5 text-2xl font-bold text-ink">
            Hola, {nombre ?? "colaborador"}
          </h2>
          {area && <p className="mt-1 text-sm text-ink-muted">{area}</p>}

          <div className="mt-6 rounded-lg bg-surface-muted px-4 py-3.5">
            <p className="text-base font-semibold text-emerald-700">
              {tipo === "SALIDA" ? "Salida" : "Entrada"} registrada a las{" "}
              <span className="u-mono tnum">{hora}</span> hrs
            </p>
          </div>

          {sede && (
            <p className="mt-3 text-xs text-ink-subtle">
              Verificado en <span className="font-medium text-ink-muted">{sede}</span>
              {distanciaM !== null && distanciaM !== undefined
                ? ` · ${Math.round(distanciaM)} m del punto de control`
                : ""}
            </p>
          )}

          {aviso && (
            <p className="mt-3 rounded-lg bg-amber-50 px-4 py-3 text-left text-xs leading-relaxed text-amber-800">
              {aviso}
            </p>
          )}

          <button
            type="button"
            onClick={onAceptar}
            className="u-btn u-btn-primary mt-6 w-full"
          >
            Aceptar
          </button>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Error / sin ubicación                                             */
  /* ---------------------------------------------------------------- */
  if (esError) {
    const sinUbicacion = estado === "sin-ubicacion";

    return (
      <div className="w-full max-w-lg animate-scale-in">
        <div className="u-hero bg-white/95 p-7 sm:p-9">
          <span
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
              sinUbicacion
                ? "bg-amber-50 text-amber-600"
                : "bg-primary-wash text-primary"
            }`}
          >
            <IconoAlerta />
          </span>

          <h2 className="u-display mt-5 text-xl font-bold text-ink">
            {sinUbicacion
              ? "Activa tu ubicación para registrar"
              : "No se pudo registrar"}
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            {mensaje ??
              "Activa tu ubicación para registrar tu entrada o salida."}
          </p>

          {nombre && (
            <p className="mt-4 text-sm text-ink-subtle">
              Registrando para <span className="font-semibold text-ink-muted">{nombre}</span>
              {ultimaMarca && ` · última marca ${ultimaMarca}`}
            </p>
          )}

          <button
            type="button"
            onClick={onReintentar}
            className="u-btn u-btn-primary mt-6 w-full"
          >
            Reintentar
          </button>

          <div className="mt-6 rounded-lg bg-surface-muted p-4 text-left text-[11px] leading-relaxed text-ink-muted">
            <p className="font-semibold text-ink">Permitir la ubicación</p>
            <p className="mt-1">
              <strong>iPhone:</strong> Ajustes › Privacidad y seguridad ›
              Servicios de ubicación › Safari › «Mientras usas la app».
            </p>
            <p className="mt-1">
              <strong>Android:</strong> Ajustes › Ubicación › Permisos de
              ubicación de apps › tu navegador › «Permitir solo mientras se usa
              la app».
            </p>
            <p className="mt-2 text-ink-subtle">
              Sin ubicación no se registra nada. Es un requisito del sistema.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Esperando: pedir ubicación                                        */
  /* ---------------------------------------------------------------- */
  return (
    <div className="w-full max-w-lg animate-fade-up text-center">
      <div className="u-hero bg-white/95 p-8">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-wash text-primary">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-spin-slow"
            aria-hidden="true"
          >
            <path d="M12 2a10 10 0 1 0 10 10" />
          </svg>
        </span>

        <h2 className="u-display mt-5 text-xl font-bold text-ink">
          Obteniendo tu ubicación
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Permite el acceso a la ubicación para registrar tu{" "}
          {tipo === "SALIDA" ? "salida" : "entrada"}. La terminal necesita
          confirmar que estás en la sede.
        </p>

        {nombre && (
          <p className="mt-4 text-sm text-ink-subtle">
            Registrando para{" "}
            <span className="font-semibold text-ink-muted">{nombre}</span>
          </p>
        )}

        {onCancelar && (
          <button
            type="button"
            onClick={onCancelar}
            className="u-btn u-btn-ghost mt-6 w-full"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Pie institucional que se muestra bajo la tarjeta de resultado.
 */
export function PieTerminal(): JSX.Element {
  return (
    <footer className="mt-8 flex flex-col items-center gap-3 text-center">
      <Logo variant="mark" height={22} />
      <p className="text-xs text-ink-subtle">
        NerWork · Sistema de Control de Asistencia
      </p>
    </footer>
  );
}
