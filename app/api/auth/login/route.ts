/**
 * POST /api/auth/login
 *
 * Login del administrador. Valida credenciales vía Supabase Auth y verifica
 * que el correo esté en la tabla `admins`.
 *
 * Body: { "email": "...", "password": "..." }
 */
import { NextRequest, NextResponse } from "next/server";
import { login } from "@/server/auth";
import { cabecerasCors } from "@/lib/cors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: cabecerasCors(request.headers.get("origin")),
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, mensaje: "Cuerpo inválido" },
      { status: 400, headers: cabecerasCors(request.headers.get("origin")) }
    );
  }

  const { email, password } = body as { email?: string; password?: string };

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, mensaje: "Email y contraseña requeridos." },
      { status: 400, headers: cabecerasCors(request.headers.get("origin")) }
    );
  }

  const resultado = await login(email, password);

  if (!resultado.ok) {
    return NextResponse.json(
      { ok: false, mensaje: resultado.mensaje },
      { status: 401, headers: cabecerasCors(request.headers.get("origin")) }
    );
  }

  return NextResponse.json(
    { ok: true, sesion: resultado.sesion },
    { headers: cabecerasCors(request.headers.get("origin")) }
  );
}
