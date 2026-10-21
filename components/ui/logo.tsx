/**
 * Marca de la aplicación: marca gráfica + wordmark "NerWork".
 * El SVG es inline para que herede el color y no dependa de un asset externo.
 */
import type { CSSProperties } from "react";

export interface LogoProps {
  /** "mark" solo el símbolo, "full" símbolo + wordmark. */
  variant?: "mark" | "full";
  /** Tamaño de la altura del símbolo en píxeles. */
  height?: number;
  className?: string;
  style?: CSSProperties;
}

export function Logo({
  variant = "full",
  height = 26,
  className = "",
  style,
}: LogoProps): JSX.Element {
  const symbol = (
    <svg
      width={height * 1.45}
      height={height}
      viewBox="0 0 38 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      {/* Barra vertical + arcos descendentes: la marca ")))" */}
      <rect x="0" y="6" width="3.4" height="14" rx="1.7" fill="#DC2626" />
      <path
        d="M11 2.5C15.5 6.5 15.5 19.5 11 23.5"
        stroke="#DC2626"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M19 4.5C23 8 23 18 19 21.5"
        stroke="#DC2626"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M26.5 7C29.8 9.5 29.8 16.5 26.5 19"
        stroke="#DC2626"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <circle cx="34" cy="13" r="2.4" fill="#DC2626" />
    </svg>
  );

  if (variant === "mark") {
    return (
      <span className={`inline-flex items-center ${className}`} style={style}>
        {symbol}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-2 ${className}`}
      style={style}
    >
      {symbol}
      <span className="u-display text-[1.35em] font-extrabold leading-none text-ink">
        Ner
        <span className="text-primary">Work</span>
      </span>
    </span>
  );
}
