import { TerminalCompartida } from "@/components/ui/terminal-compartida";

/**
 * Terminal compartida: la etiqueta NFC/QR apunta a /c (sin token personal).
 *
 * Quien escanea se identifica con su correo (o su nombre) y el sistema
 * reconoce su dispositivo para las siguientes checadas.
 */
export default function TerminalCompartidaPage(): JSX.Element {
  return <TerminalCompartida />;
}
