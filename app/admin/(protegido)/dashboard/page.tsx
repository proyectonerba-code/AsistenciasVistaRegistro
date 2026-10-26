/**
 * Dashboard del administrador: resumen de asistencia del día.
 * Obtiene datos del backend vía API.
 */
import { requireSupabaseAdmin } from "@/lib/supabase/server";
import { fechaLocal, inicioDiaMx, finDiaMx } from "@/lib/tz";

async function obtenerMetricas() {
  const cliente = requireSupabaseAdmin();
  const hoy = fechaLocal(new Date());
  const inicio = inicioDiaMx(hoy);
  const fin = finDiaMx(hoy);

  // Total de usuarios activos
  const { data: usuarios } = await cliente
    .from("usuarios")
    .select("id, activo")
    .eq("activo", true);

  // Dispositivos activos
  const { data: dispositivos } = await cliente
    .from("dispositivos")
    .select("id, activo")
    .eq("activo", true);

  // Marcas de hoy
  const { data: marcasHoy } = await cliente
    .from("marcas")
    .select("usuario_id, ts")
    .gte("ts", inicio.toISOString())
    .lte("ts", fin.toISOString());

  // Usuarios con entrada abierta (impar número de marcas hoy)
  const porUsuario = new Map<string, number>();
  for (const m of marcasHoy ?? []) {
    const c = (porUsuario.get(m.usuario_id) ?? 0) + 1;
    porUsuario.set(m.usuario_id, c);
  }
  let pendientes = 0;
  for (const [, c] of porUsuario) {
    if (c % 2 === 1) pendientes++;
  }

  return {
    totalUsuarios: usuarios?.length ?? 0,
    totalDispositivos: dispositivos?.length ?? 0,
    marcasHoy: marcasHoy?.length ?? 0,
    pendientes,
  };
}

export default async function DashboardPage() {
  let metricas;
  try {
    metricas = await obtenerMetricas();
  } catch {
    metricas = {
      totalUsuarios: 0,
      totalDispositivos: 0,
      marcasHoy: 0,
      pendientes: 0,
    };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="u-display text-2xl font-extrabold text-ink mb-1">
          Panel de Administración
        </h1>
        <p className="text-sm text-ink-muted">
          Resumen del control de asistencia
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricaCard
          titulo="Colaboradores activos"
          valor={metricas.totalUsuarios}
          icono="👥"
          color="text-primary"
        />
        <MetricaCard
          titulo="Dispositivos vinculados"
          valor={metricas.totalDispositivos}
          icono="📱"
          color="text-emerald-600"
        />
        <MetricaCard
          titulo="Checadas hoy"
          valor={metricas.marcasHoy}
          icono="⏱️"
          color="text-amber-600"
        />
        <MetricaCard
          titulo="Entradas abiertas"
          valor={metricas.pendientes}
          icono="⚠️"
          color={metricas.pendientes > 0 ? "text-danger" : "text-success"}
        />
      </div>

      <div className="u-card p-6">
        <h2 className="u-label mb-4">Acciones rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <a
            href="/admin/usuarios"
            className="u-btn u-btn-primary flex items-center justify-center gap-2"
          >
            <span>👤</span> Gestionar colaboradores
          </a>
          <a
            href="/admin/dispositivos"
            className="u-btn u-btn-primary flex items-center justify-center gap-2"
          >
            <span>📱</span> Asignar dispositivos
          </a>
          <a
            href="/admin/justificaciones"
            className="u-btn u-btn-primary flex items-center justify-center gap-2"
          >
            <span>📋</span> Justificaciones
          </a>
          <a
            href="/admin/reportes"
            className="u-btn u-btn-primary flex items-center justify-center gap-2"
          >
            <span>📊</span> Ver reportes
          </a>
          <a
            href="/"
            className="u-btn u-btn-secondary flex items-center justify-center gap-2"
          >
            <span>📟</span> Terminal de checada
          </a>
        </div>
      </div>
    </div>
  );
}

function MetricaCard({
  titulo,
  valor,
  icono,
  color,
}: {
  titulo: string;
  valor: number;
  icono: string;
  color: string;
}) {
  return (
    <div className="u-card p-5">
      <div className="flex justify-between items-start mb-2">
        <span className="text-sm text-ink-muted">{titulo}</span>
        <span className={`text-2xl font-bold ${color}`}>{icono}</span>
      </div>
      <div className="text-3xl font-extrabold text-ink">{valor}</div>
    </div>
  );
}
