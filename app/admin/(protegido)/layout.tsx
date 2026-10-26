/**
 * Layout protegido del panel admin: verifica sesión en el servidor.
 * Si no hay sesión válida, redirige al login.
 */
import { redirect } from "next/navigation";
import { obtenerSesion } from "@/server/auth";

export default async function AdminProtegidoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sesion = await obtenerSesion();
  if (!sesion) {
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <AdminShell />
      <main className="flex-1 mx-auto max-w-6xl px-4 sm:px-6 py-6">
        {children}
      </main>
    </div>
  );
}

function AdminShell() {
  return (
    <header className="u-glass sticky top-0 z-20 border-b border-black/5 mb-6">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white text-sm font-bold">
            N
          </span>
          <span className="u-display text-lg font-bold text-ink">NerWork · Admin</span>
        </div>
        <nav className="flex items-center gap-4 sm:gap-6">
          <a
            href="/admin/dashboard"
            className="text-sm font-medium text-ink-muted hover:text-primary transition"
          >
            Inicio
          </a>
          <a
            href="/admin/usuarios"
            className="text-sm font-medium text-ink-muted hover:text-primary transition"
          >
            Colaboradores
          </a>
          <a
            href="/admin/dispositivos"
            className="text-sm font-medium text-ink-muted hover:text-primary transition"
          >
            Dispositivos
          </a>
          <a
            href="/admin/reportes"
            className="text-sm font-medium text-ink-muted hover:text-primary transition"
          >
            Reportes
          </a>
          <a
            href="/admin/justificaciones"
            className="text-sm font-medium text-ink-muted hover:text-primary transition"
          >
            Justificaciones
          </a>
          <a
            href="/"
            className="text-sm font-medium text-ink-muted hover:text-primary transition"
          >
            Terminal de checada
          </a>
        </nav>
      </div>
    </header>
  );
}
