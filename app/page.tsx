import { NfcHero } from "@/components/ui/nfc-hero";
import { TerminalHeader } from "@/components/ui/terminal-header";
import { PieTerminal } from "@/components/ui/checada-display";

/**
 * Pantalla de reposo de la terminal.
 *
 * Se muestra cuando nadie ha escaneado una credencial. Al detectar el NFC o
 * el QR, el terminal abre /c/<token> y ahí se hace la checada.
 */
export default function HomePage(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <TerminalHeader />

      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:py-16">
        <div className="w-full max-w-2xl text-center">
          <NfcHero
            tono="listo"
            titulo="Acerque su tarjeta o sticker NFC"
            subtitulo="Listo para registrar entrada o salida"
          />

          <div className="u-card mx-auto mt-10 flex max-w-md items-center gap-3 p-4 text-left">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-surface-muted text-ink-muted">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <path d="M2 10h20" />
              </svg>
            </span>
            <p className="text-sm text-ink-muted">
              Coloque su credencial frente al sensor de la terminal
            </p>
          </div>

          <PieTerminal />
        </div>
      </main>
    </div>
  );
}
