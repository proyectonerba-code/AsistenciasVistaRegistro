"use client";

/**
 * Gestión de dispositivos: listar celulares/tablets, ver cuáles están
 * asignados a un colaborador y asignar los que no lo están.
 * Llama al backend vía API.
 */
import { useState, useEffect, useCallback } from "react";

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

interface Usuario {
  id: string;
  nombre: string;
  correo: string;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

export default function DispositivosPage() {
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [asignandoHuella, setAsignandoHuella] = useState<string | null>(null);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState("");

  const fetchData = useCallback(async () => {
    setCargando(true);
    try {
      const [resDisp, resUsu] = await Promise.all([
        fetch(`${API_URL}/api/dispositivos/no-asignados`, {
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        }),
        fetch(`${API_URL}/api/usuarios`, {
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        }),
      ]);
      const jsonDisp = await resDisp.json();
      const jsonUsu = await resUsu.json();

      if (jsonDisp.ok) {
        setDispositivos(jsonDisp.dispositivos);
      }
      if (jsonUsu.ok) {
        setUsuarios(jsonUsu.usuarios);
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

  const asignar = async (huella: string) => {
    if (!usuarioSeleccionado) {
      setError("Selecciona un colaborador.");
      return;
    }
    setAsignandoHuella(huella);
    try {
      const res = await fetch(`${API_URL}/api/dispositivo/asignar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ huella, usuarioId: usuarioSeleccionado }),
      });
      const json = await res.json();
      if (json.ok) {
        setAsignandoHuella(null);
        setUsuarioSeleccionado("");
        setError(null);
        await fetchData();
      } else {
        setError(json.error?.mensaje || "Error asignando dispositivo.");
        setAsignandoHuella(null);
      }
    } catch {
      setError("No se pudo conectar con el servidor.");
      setAsignandoHuella(null);
    }
  };

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <p className="text-ink-muted">Cargando dispositivos…</p>
      </div>
    );
  }

  const noAsignados = dispositivos.filter((d) => !d.usuarioId);
  const asignados = dispositivos.filter((d) => d.usuarioId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="u-display text-2xl font-extrabold text-ink mb-1">
          Dispositivos
        </h1>
        <p className="text-sm text-ink-muted">
          Celulares y tablets detectados en la terminal. Desde aquí se les
          <b>asigna un nombre</b> (colaborador) para que chequen sin
          identificarse cada vez.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-primary/20 bg-primary-wash px-3.5 py-2.5 text-sm font-medium text-primary"
        >
          {error}
        </div>
      )}

      {/* Asignar dispositivo sin nombre */}
      {noAsignados.length > 0 && (
        <div className="u-card p-5">
          <h2 className="u-label mb-3">Dispositivos sin asignar</h2>
          <p className="text-sm text-ink-muted mb-3">
            Estos celulares se detectaron pero no están vinculados a ningún
            colaborador. Asígnales un nombre para que chequen directo.
          </p>
          <div className="space-y-2">
            {noAsignados.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-line bg-surface">
                <div>
                  <p className="text-sm font-semibold text-ink truncate" title={d.etiqueta || d.huella}>
                    {d.etiqueta || `Dispositivo ${d.huella.slice(0, 8)}…`}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {d.agente || "Desconocido"} · {d.veces} detección{d.veces !== 1 ? "es" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={usuarioSeleccionado}
                    onChange={(e) => setUsuarioSeleccionado(e.target.value)}
                    className="u-input text-sm flex-1 max-w-xs"
                  >
                    <option value="">Seleccionar colaborador…</option>
                    {usuarios.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nombre} — {u.correo}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => asignar(d.huella)}
                    disabled={asignandoHuella === d.huella || !usuarioSeleccionado}
                    className="u-btn u-btn-primary u-btn-sm"
                  >
                    {asignandoHuella === d.huella ? "Asignando…" : "Asignar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dispositivos ya asignados */}
      <div className="u-card overflow-hidden">
        <div className="overflow-x-auto u-scroll">
          <table className="u-table">
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Dispositivo</th>
                <th className="text-center">Checadas</th>
                <th className="text-center">Última actividad</th>
                <th className="text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {asignados.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-ink-muted">
                    No hay dispositivos asignados todavía.
                  </td>
                </tr>
              )}
              {asignados.map((d) => {
                const u = usuarios.find((x) => x.id === d.usuarioId);
                return (
                  <tr key={d.id}>
                    <td>
                      <p className="font-semibold text-ink truncate" title={u?.nombre}>
                        {u?.nombre || "—"}
                      </p>
                      {u && (
                        <p className="text-xs text-ink-muted">{u.correo}</p>
                      )}
                    </td>
                    <td>
                      <span className="u-badge u-badge-neutral">
                        {d.etiqueta || `Dispositivo ${d.huella.slice(0, 8)}…`}
                      </span>
                    </td>
                    <td className="text-center u-mono tnum text-xs font-bold">
                      {d.veces}
                    </td>
                    <td className="text-center u-mono text-xs">
                      {d.ultimaMarca ? new Date(d.ultimaMarca).toLocaleString("es-MX") : "—"}
                    </td>
                    <td className="text-center">
                      <span
                        className={`u-badge ${
                          d.activo ? "u-badge-success" : "u-badge-neutral"
                        }`}
                      >
                        <span className="u-dot" />
                        {d.activo ? "Activo" : "Sin asignar"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-ink-subtle">
        Un dispositivo asignado permite checar entrada/salida sin pedir
        identificación: la terminal lo reconoce automáticamente.
      </p>
    </div>
  );
}
