"use client";

/**
 * Pantalla de administración: asociar dispositivos (celulares) a nombres.
 *
 * El admin ve:
 *  1. Lista de colaboradores disponibles.
 *  2. Lista de celulares detectados que NO están asignados.
 *  3. Puede asignar un celular a un colaborador para que cheque directo.
 */

import { useState, useEffect, useCallback } from "react";

interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  area: string;
  activo: boolean;
}

interface Dispositivo {
  id: string;
  huella: string;
  etiqueta: string | null;
  agente: string | null;
  primeraMarca: string | null;
  ultimaMarca: string | null;
  veces: number;
  activo: boolean;
  usuarioId: string | null;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

export default function AsociarPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  // Formulario de asignación
  [, setError]; // usar setError arriba
  const [dispositivoSeleccionado, setDispositivoSeleccionado] = useState("");
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState("");
  const [asignando, setAsignando] = useState(false);

  const fetchData = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [resUsu, resDisp] = await Promise.all([
        fetch(`${API_URL}/api/usuarios`, {
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        }),
        fetch(`${API_URL}/api/dispositivos/no-asignados`, {
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        }),
      ]);

      const jsonUsu = await resUsu.json();
      const jsonDisp = await resDisp.json();

      if (jsonUsu.ok) {
        setUsuarios(jsonUsu.usuarios.filter((u: Usuario) => u.activo));
      } else {
        setError(jsonUsu.error?.mensaje || "Error cargando colaboradores.");
      }

      if (jsonDisp.ok) {
        setDispositivos(jsonDisp.dispositivos);
      } else {
        setError(jsonDisp.error?.mensaje || "Error cargando dispositivos.");
      }
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const asignar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setExito(null);

    if (!dispositivoSeleccionado || !usuarioSeleccionado) {
      setError("Selecciona un dispositivo y un colaborador.");
      return;
    }

    setAsignando(true);
    try {
      const res = await fetch(`${API_URL}/api/dispositivo/asignar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          huella: dispositivoSeleccionado,
          usuarioId: usuarioSeleccionado,
        }),
      });

      const json = await res.json();

      if (json.ok) {
        setExito(json.mensaje || "Dispositivo asignado correctamente.");
        setDispositivoSeleccionado("");
        setUsuarioSeleccionado("");
        await fetchData();
      } else {
        setError(json.error?.mensaje || "Error asignando dispositivo.");
      }
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setAsignando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <p className="text-ink-muted">Cargando…</p>
      </div>
    );
  }

  const noAsignados = dispositivos.filter((d) => !d.usuarioId);

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <header className="u-glass sticky top-0 z-20 border-b border-black/5">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white text-sm font-bold">
              N
            </span>
            <span className="u-display text-lg font-bold text-ink">
              NerWork · Administración
            </span>
          </div>
          <nav className="flex items-center gap-4 sm:gap-6">
            <a
              href="/"
              className="text-sm font-medium text-ink-muted hover:text-primary transition"
            >
              Terminal de checada
            </a>
          </nav>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-4xl px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="u-display text-2xl font-bold text-ink mb-1">
            Asociar dispositivos
          </h1>
          <p className="text-sm text-ink-muted">
            Asigna celulares detectados a los colaboradores para que puedan
            checar entrada y salida sin identificarse cada vez.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg border border-primary/20 bg-primary-wash px-3.5 py-2.5 text-sm font-medium text-primary"
          >
            {error}
          </div>
        )}
        {exito && (
          <div
            role="status"
            className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-700"
          >
            {exito}
          </div>
        )}

        <div className="u-card p-6">
          <h2 className="u-label mb-4">Asignar celular a colaborador</h2>
          <form onSubmit={asignar} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="dispositivo"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Celular (dispositivo sin asignar)
                </label>
                <select
                  id="dispositivo"
                  value={dispositivoSeleccionado}
                  onChange={(e) => setDispositivoSeleccionado(e.target.value)}
                  className="u-input"
                  required
                >
                  <option value="">Seleccionar dispositivo…</option>
                  {noAsignados.map((d) => (
                    <option key={d.id} value={d.huella}>
                      {d.etiqueta || `Dispositivo ${d.huella.slice(0, 8)}…`}
                      {d.veces > 1 ? ` (${d.veces} detecciones)` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="usuario"
                  className="mb-1.5 block text-sm font-medium text-ink"
                >
                  Colaborador
                </label>
                <select
                  id="usuario"
                  value={usuarioSeleccionado}
                  onChange={(e) => setUsuarioSeleccionado(e.target.value)}
                  className="u-input"
                  required
                >
                  <option value="">Seleccionar colaborador…</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre} — {u.area}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={asignando}
              className="u-btn u-btn-primary w-auto"
            >
              {asignando ? "Asignando…" : "Asignar dispositivo"}
            </button>
          </form>
        </div>

        {usuarios.length > 0 && (
          <div className="u-card p-6 mt-6">
            <h2 className="u-label mb-4">Colaboradores disponibles</h2>
            <div className="overflow-x-auto u-scroll">
              <table className="u-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Correo</th>
                    <th className="text-center">Área</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.id}>
                      <td className="font-medium text-ink">{u.nombre}</td>
                      <td className="u-mono text-xs text-ink-muted">{u.correo}</td>
                      <td className="text-center">
                        <span className="u-badge u-badge-neutral">{u.area}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {noAsignados.length === 0 && usuarios.length > 0 && (
          <p className="mt-6 text-center text-xs text-ink-subtle">
            No hay dispositivos sin asignar. Todos los celulares detectados
            ya están vinculados a un colaborador.
          </p>
        )}
      </main>
    </div>
  );
}
