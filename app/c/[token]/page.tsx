import { Suspense } from "react";
import { ChecadaVista } from "./checada-vista";

/**
 * Página pública de checada /c/[token] (vista de escaneo NFC/QR).
 *
 * Server Component: solo pasa los params a la vista cliente, que se encarga
 * del layout completo (cabecera de terminal + tarjeta de resultado).
 */
export default function ChecadaPage({
  params,
}: {
  params: { token?: string } | Promise<{ token?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas">
          <span className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <p className="text-sm text-ink-muted">Validando credencial…</p>
        </div>
      }
    >
      <ChecadaVista params={params} />
    </Suspense>
  );
}
