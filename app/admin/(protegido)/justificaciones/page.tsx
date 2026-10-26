"use client";

/**
 * Justificaciones: faltas justificadas manualmente por el administrador
 * (enfermedad, día festivo, asunto propio, otro) con motivo escrito a mano.
 * Llama al backend vía API.
 */
import { useState, useEffect, useCallback } from "react";

interface Justificacion {
  id: string;
  usuarioId: string;
  nombre: string;
  correo: string;
  fecha: string;
  tipo: string;
  motivo: string;
  creadaEn: string;
}

interface Usuario {
  id: string;
  nombre: string;
  correo: string;
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? window.location.origin : "");

const TIPOS: { valor: string; etiqueta: string; color: string }[] = [
  { valor: "enfermedad", etiqueta: "Enfermedad", color: "text-emerald-600" },
  { valor: "festivo", etiqueta: "Día festivo", color: "text-amber-600" },
  { valor: "asunto_proprio", etiqueta: "Asunto propio", color: "text-primary" },
  { valor: "otro", etiqueta: "Otro", color: "text-ink-muted" },
];

export default function JustificacionesPage() {
  const [justificaciones, setJustificaciones] = useState<Justificacion[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  // Formulario de nueva justificación
  const [usuarioId, setUsuarioId] = useState("");
  const [fecha, setFecha] = useState("");
  const [tipo, setTipo] = useState("enfermedad");
  const [motivo, setMotivo] = useState("");
  const [creando, setCreando] = useState(false);

  const fetchData = useCallback(async () => {
    setCargando(true);
    try {
      const [resJus, resUsu] = await Promise.all([
        fetch(`${API_URL}/api/justificaciones`, {
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        }),
        fetch(`${API_URL}/api/usuarios`, {
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        }),
      ]);
      const jsonJus = await resJus.json();
      const jsonUsu = await resUsu.json();

      if (jsonJus.ok) {
        setJustificaciones(jsonJus.justificaciones);
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

  const crearJustificacion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setExito(null);
    setCreando(true);

    try {
      const res = await fetch(`${API_URL}/api/justificaciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario_id: usuarioId,
          fecha,
          tipo,
          motivo: motivo.trim(),
        }),
      });
      const json = await res.json();

      if (json.ok) {
        setExito(json.mensaje);
        setUsuarioId("");
        setFecha("");
        setTipo("enfermedad");
        setMotivo("");
        setCreando(false);
        await fetchData();
      } else {
        setError(json.error?.mensaje || "Error creando justificación.");
        setCreando(false);
      }
    } catch {
      setError("No se pudo conectar con el servidor.");
      setCreando(false);
    }
  };

  const hoy = new Date().toISOString().slice(0, 10);

  if (cargando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <p className="text-ink-muted">Cargando justificaciones…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="u-display text-2xl font-extrabold text-ink mb-1">
            Justificaciones
          </h1>
          <p className="text-sm text-ink-muted">
            Registra faltas justificadas (enfermedad, día festivo, asunto
            propio, otro) con motivo escrito por el administrador.
          </p>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-primary/20 bg-primary-wash px-3.5 py-2.5 text-sm font-medium text-primary"
        >
          {error}
        </div>
      )}
      {exito && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-700"
        >
          {exito}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario nueva justificación */}
        <div className="u-card p-5 lg:col-span-1">
          <h2 className="u-label mb-4">Nueva justificación</h2>
          <form onSubmit={crearJustificacion} className="space-y-3">
            <div>
              <label
                htmlFor="jus-usuario"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                Colaborador
              </label>
              <select
                id="jus-usuario"
                value={usuarioId}
                onChange={(e) => setUsuarioId(e.target.value)}
                className="u-input"
                required
              >
                <option value="">Seleccionar colaborador…</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre} — {u.correo}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="jus-fecha"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                Fecha
              </label>
              <input
                id="jus-fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                defaultValue={hoy}
                className="u-input"
                required
              />
            </div>

            <div>
              <label
                htmlFor="jus-tipo"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                Tipo
              </label>
              <select
                id="jus-tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="u-input"
              >
                {TIPOS.map((t) => (
                  <option key={t.valor} value={t.valor} className={t.color}>
                    {t.etiqueta}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="jus-motivo"
                className="mb-1.5 block text-sm font-medium text-ink"
              >
                Motivo (escrito a mano)
              </label>
              <textarea
                id="jus-motivo"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                rows={3}
                placeholder="Ejemplo: Gripe, presentó certificado médico…"
                className="u-input h-auto py-2.5"
                required
              />
            </div>

            <button
              type="submit"
              disabled={creando}
              className="u-btn u-btn-primary w-full"
            >
              {creando ? "Guardando…" : "Registrar justificación"}
            </button>
          </form>
        </div>

        {/* Listado de justificaciones */}
        <div className="u-card overflow-hidden lg:col-span-1">
          <h2 className="u-label p-4 border-b border-line">Registros</h2>
          <div className="overflow-x-auto u-scroll">
            <table className="u-table u-table-compact">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Colaborador</th>
                  <th className="text-center">Tipo</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {justificaciones.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-ink-muted">
                      No hay justificaciones registradas.
                    </td>
                  </tr>
                )}
                {justificaciones.map((j) => (
                  <tr key={j.id}>
                    <td className="u-mono text-xs">{j.fecha}</td>
                    <td className="text-sm font-medium text-ink truncate" title={j.nombre}>
                      {j.nombre}
                    </td>
                    <td className="text-center">
                      <span
                        className={`u-badge u-badge-neutral text-xs ${TIPOS.find((t) => t.valor === j.tipo)?.color}`}
                      >
                        {TIPOS.find((t) => t.valor === j.tipo)?.etiqueta || j.tipo}
                      </span>
                    </td>
                    <td className="text-sm text-ink-muted truncate" title={j.motivo}>
                      {j.motivo}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <p className="text-xs text-ink-subtle">
        Las justificaciones quedan registradas por colaborador y fecha. Una
        persona solo puede tener una justificación por día.
      </p>
    </div>
  );
}
