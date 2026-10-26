/**
 * Cabeceras CORS para las API routes del front unificado.
 */
export function cabecerasCors(origenPeticion?: string | null): Record<string, string> {
  const origen = origenPeticion ?? "*";
  return {
    "Access-Control-Allow-Origin": origen,
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-admin-correo",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
