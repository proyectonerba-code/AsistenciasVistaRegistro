"use client";

/**
 * Página de login del administrador.
 * Envía credenciales a /api/auth/login y, si es exitoso, redirige al dashboard.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_URL =
    (process.env.NEXT_PUBLIC_API_URL || "").trim() ||
    (typeof window !== "undefined" ? window.location.origin : "");

  const manejarLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();

      if (!json.ok || !json.sesion) {
        setError(json.mensaje || "Correo o contraseña incorrectos.");
        setCargando(false);
        return;
      }

      // Éxito: redirigir al dashboard.
      router.push("/admin/dashboard");
    } catch {
      setError("No se pudo conectar con el servidor.");
      setCargando(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <div className="w-full max-w-md px-4 sm:px-6 lg:px-8">
        <div className="u-card p-8 sm:p-10 mx-auto max-w-sm">
          <div className="flex items-center justify-center mb-6">
            <Logo height={28} />
          </div>

          <h2 className="u-display mt-2 mb-6 text-center text-2xl font-extrabold text-ink">
            Iniciar sesión
          </h2>
          <p className="text-center text-sm text-ink-muted mb-8">
            Panel de administración · Control de Asistencia
          </p>

          {error && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-primary/20 bg-primary-wash px-3.5 py-2.5 text-sm font-medium text-primary"
            >
              {error}
            </div>
          )}

          <form onSubmit={manejarLogin} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@empresa.com"
                className="u-input"
                required
                autoFocus
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="u-input"
                required
              />
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="u-btn u-btn-primary w-full"
            >
              {cargando ? "Iniciando sesión…" : "Iniciar sesión"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-ink-subtle">
            Solo cuentas registradas en la tabla `admins` pueden acceder.
          </p>
        </div>
      </div>
    </div>
  );
}
