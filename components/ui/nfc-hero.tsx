"use client";

/**
 * Hero del lector NFC: círculos concéntricos con pulso, indicador "Lector
 * listo" y la instrucción de aproximación de la tarjeta.
 */
export interface NfcHeroProps {
  /** Cambia el matiz del pulso: verde cuando está leyendo, ámbar al esperar. */
  tono?: "listo" | "leyendo" | "error";
  titulo: string;
  subtitulo: string;
}

const TONES = {
  listo: {
    anillo: "bg-emerald-100",
    pulso: "bg-emerald-400/40",
    punto: "bg-emerald-600",
    chip: "u-badge-success",
    texto: "text-emerald-700",
  },
  leyendo: {
    anillo: "bg-primary-wash",
    pulso: "bg-primary/30",
    punto: "bg-primary",
    chip: "u-badge-danger",
    texto: "text-primary",
  },
  error: {
    anillo: "bg-amber-100",
    pulso: "bg-amber-400/40",
    punto: "bg-amber-500",
    chip: "u-badge-warning",
    texto: "text-amber-700",
  },
} as const;

export function NfcHero({
  tono = "listo",
  titulo,
  subtitulo,
}: NfcHeroProps): JSX.Element {
  const t = TONES[tono];

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative flex h-56 w-56 items-center justify-center sm:h-64 sm:w-64">
        {/* Ondas de pulso */}
        <span
          className={`absolute inset-0 rounded-full ${t.pulso} animate-pulse-ring`}
          aria-hidden="true"
        />
        <span
          className={`absolute inset-6 rounded-full ${t.pulso} animate-pulse-ring`}
          style={{ animationDelay: "800ms" }}
          aria-hidden="true"
        />
        {/* Anillo estático */}
        <span
          className={`absolute inset-2 rounded-full ${t.anillo}`}
          aria-hidden="true"
        />
        {/* Botón central */}
        <span
          className="relative flex h-28 w-28 items-center justify-center rounded-full bg-white shadow-card sm:h-32 sm:w-32"
          aria-hidden="true"
        >
          <svg
            width="46"
            height="46"
            viewBox="0 0 24 24"
            fill="none"
            stroke={t.punto.replace("bg-", "")}
            className={
              tono === "listo"
                ? "stroke-emerald-600"
                : tono === "error"
                  ? "stroke-amber-500"
                  : "stroke-primary"
            }
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 8.32a7.43 7.43 0 0 1 0 7.36" />
            <path d="M9.46 6.21a11.76 11.76 0 0 1 0 11.58" />
            <path d="M12.91 4.1a15.91 15.91 0 0 1 .01 15.79" />
            <path d="M16.37 2a20.16 20.16 0 0 1 0 20" />
          </svg>
        </span>
      </div>

      <span className={`u-badge ${t.chip} mt-2`}>
        <span className="u-dot" />
        {tono === "listo" ? "Lector listo" : tono === "leyendo" ? "Leyendo…" : "Revisar"}
      </span>

      <h1 className="u-display mt-5 max-w-lg text-3xl font-extrabold leading-[1.15] text-ink sm:text-4xl">
        {titulo}
      </h1>
      <p className="mt-3 max-w-md text-base text-ink-muted sm:text-lg">
        {subtitulo}
      </p>
    </div>
  );
}
