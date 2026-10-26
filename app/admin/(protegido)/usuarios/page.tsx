"use client";

/**
 * Gestión de colaboradores: listado, activar/desactivar y establecer
 * fecha de inicio de laburo (para vacaciones/años de servicio).
 * Llama al backend vía API.
 */
import { useState, useEffect, useCallback } from "react";

interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  area: string;
  minutosComida: number;
  legajo: number | null;
  etiquetaNfc: string | null;
  tokenPrefijo: string | null;
  activo: boolean;
  fechaInicioLaburo: string | null;
  creadoEn: string | null;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [fechaInicio, setFechaInicio] = useState("");

  const fetchUsuarios = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch(`${API_URL}/api/usuarios`, {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      const json = await res.json();
      if (json.ok) {
        setUsuarios(json.usuarios);
      } else {
        setError(json.error?.mensaje || "Error cargando usuarios.");
      }
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  const guardarFechaInicio = async (usuarioId: string) => {
    try {
      const res = await fetch(
        `${API_URL}/api/usuarios/${usuarioId}/fecha-inicio`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fecha_inicio_laburo: fechaInicio || null }),
        }
      );
      const json = await res.json();
      if (json.ok) {
        setEditandoId(null);
        setFechaInicio("");
        await fetchUsuarios();
      } else {
        setError(json.error?.mensaje || "Error actualizando fecha.");
      }
    } catch {
      setError("No se pudo conectar con el servidor.");
    }
  };

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <p className="text-ink-muted">Cargando colaboradores…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="u-display text-2xl font-extrabold text-ink mb-1">
          Colaboradores
        </h1>
        <p className="text-sm text-ink-muted">
          Lista de trabajadores del sistema. Desde aquí se asigna la
          <b>fecha de inicio de laburo</b> para calcular años de servicio y
          vacaciones.
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

      <div className="u-card overflow-hidden">
        <div className="overflow-x-auto u-scroll">
          <table className="u-table">
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Correo</th>
                <th>Área</th>
                <th className="text-center">Inicio de laburo</th>
                <th className="text-center">Estado</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-ink-muted">
                    No hay colaboradores registrados.
                  </td>
                </tr>
              )}
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td className="font-semibold text-ink truncate" title={u.nombre}>
                    {u.nombre}
                  </td>
                  <td className="u-mono text-xs text-ink-muted truncate" title={u.correo}>
                    {u.correo}
                  </td>
                  <td>
                    <span className="u-badge u-badge-neutral">{u.area}</span>
                  </td>
                  <td className="text-center">
                    {editandoId === u.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={fechaInicio}
                          onChange={(e) => setFechaInicio(e.target.value)}
                          className="u-input text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => guardarFechaInicio(u.id)}
                          className="u-btn u-btn-primary u-btn-sm"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditandoId(null);
                            setFechaInicio("");
                          }}
                          className="u-btn u-btn-ghost u-btn-sm"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : u.fechaInicioLaburo ? (
                      <span className="text-sm text-ink">
                        {u.fechaInicioLaburo}
                      </span>
                    ) : (
                      <span className="text-xs text-ink-subtle">—</span>
                    )}
                  </td>
                  <td className="text-center">
                    <span
                      className={`u-badge ${
                        u.activo ? "u-badge-success" : "u-badge-neutral"
                      }`}
                    >
                      <span className="u-dot" />
                      {u.activo ? "Activo" : "Baja"}
                    </span>
                  </td>
                  <td className="text-right">
                    {editandoId !== u.id ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEditandoId(u.id);
                          setFechaInicio(u.fechaInicioLaburo ?? "");
                        }}
                        className="u-btn u-btn-ghost u-btn-sm text-primary"
                        title="Establecer fecha de inicio de laburo"
                      >
                        📅
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-ink-subtle">
        La fecha de inicio de laburo se usa para calcular los años de servicio
        de cada colaborador y determinar su derecho a vacaciones.
      </p>
    </div>
  );
}
