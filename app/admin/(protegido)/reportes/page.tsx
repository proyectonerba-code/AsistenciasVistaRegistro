"use client";

/**
 * Reportes de asistencia: listado de marcas (entrada/salida) por rango de
 * fechas, con filtro por colaborador. Datos del backend vía API.
 */
import { useState, useCallback } from "react";

interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  area: string;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

export default function ReportesPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [usuarioFiltro, setUsuarioFiltro] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const resUsu = await fetch(`${API_URL}/api/usuarios`, {
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      const jsonUsu = await resUsu.json();
      if (jsonUsu.ok) {
        setUsuarios(jsonUsu.usuarios);
      } else {
        setError(jsonUsu.error?.mensaje || "Error cargando colaboradores.");
      }
    } catch {
      setError("No se pudo conectar con el servidor.");
    }
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="u-display text-2xl font-extrabold text-ink mb-1">
          Reportes de Asistencia
        </h1>
        <p className="text-sm text-ink-muted">
          Consulta las marcas de entrada y salida por rango de fechas y
          colaborador.
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

      <div className="u-card p-5">
        <h2 className="u-label mb-3">Filtros</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-muted uppercase">
              Desde
            </label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="u-input text-sm"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-muted uppercase">
              Hasta
            </label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="u-input text-sm"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink-muted uppercase">
              Colaborador
            </label>
            <select
              value={usuarioFiltro}
              onChange={(e) => setUsuarioFiltro(e.target.value)}
              className="u-input text-sm"
            >
              <option value="">Todos</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={fetchData}
              className="u-btn u-btn-primary w-full"
            >
              Consultar
            </button>
          </div>
        </div>
      </div>

      <div className="u-card overflow-hidden">
        <div className="overflow-x-auto u-scroll">
          <table className="u-table">
            <thead>
              <tr>
                <th>Fecha / Hora</th>
                <th>Colaborador</th>
                <th>Área</th>
                <th className="text-center">Tipo</th>
                <th className="text-center">Distancia</th>
                <th className="text-center">Origen</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6} className="py-10 text-center text-ink-muted">
                  El endpoint de listado de marcas se agregará al backend.
                  Mientras tanto, usa el panel de administración original
                  (AsistenciasVistaAdministrador) para ver reportes detallados.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
