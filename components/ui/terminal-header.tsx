"use client";

/**
 * Cabecera de la terminal de registro: marca a la izquierda, estado de la
 * terminal y reloj en vivo a la derecha. Es la franja superior que aparece
 * en la pantalla del punto de acceso.
 */
import { useEffect, useState } from "react";
import { Logo } from "./logo";

export interface TerminalHeaderProps {
  /** Estado del lector: "activo" muestra el punto verde. */
  estado?: "activo" | "inactivo";
  /** Texto del chip de estado. */
  etiqueta?: string;
}

function useReloj(): string {
  const [hora, setHora] = useState<string>("--:--:--");

  useEffect(() => {
    const formatear = () => {
      const d = new Date();
      setHora(
        [d.getHours(), d.getMinutes(), d.getSeconds()]
          .map((n) => String(n).padStart(2, "0"))
          .join(":")
      );
    };
    formatear();
    const id = setInterval(formatear, 1000);
    return () => clearInterval(id);
  }, []);

  return hora;
}

export function TerminalHeader({
  estado = "activo",
  etiqueta = "Terminal activa",
}: TerminalHeaderProps): JSX.Element {
  const hora = useReloj();
  const activo = estado === "activo";

  return (
    <header className="u-glass sticky top-0 z-20 border-b border-black/5">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo height={26} />

        <div className="flex items-center gap-3 sm:gap-5">
          <span
            className={`u-badge ${
              activo ? "u-badge-success" : "u-badge-neutral"
            }`}
          >
            <span className="u-dot" />
            {etiqueta}
          </span>
          <time className="u-mono tnum text-sm font-semibold text-ink sm:text-base">
            {hora}
          </time>
        </div>
      </div>
    </header>
  );
}
