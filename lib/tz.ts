/**
 * Utilidades de zona horaria (América/México_City).
 * Duplicadas del backend para no depender de llamadas HTTP en el dashboard.
 */
export function ahoraMx(): Date {
  return new Date();
}

export function fechaLocal(d: Date): string {
  return d.toLocaleDateString("en-CA", {
    timeZone: "America/Mexico_City",
  }); // YYYY-MM-DD
}

export function inicioDiaMx(fecha: string | Date): Date {
  const d =
    typeof fecha === "string" ? new Date(`${fecha}T00:00:00`) : fecha;
  return new Date(
    d.toLocaleString("en-US", { timeZone: "America/Mexico_City" })
  );
}

export function finDiaMx(fecha: string | Date): Date {
  const inicio = inicioDiaMx(fecha);
  return new Date(inicio.getTime() + 24 * 60 * 60 * 1000 - 1);
}

export function formatoHM(d: Date): string {
  return d.toLocaleTimeString("es-MX", {
    timeZone: "America/Mexico_City",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
