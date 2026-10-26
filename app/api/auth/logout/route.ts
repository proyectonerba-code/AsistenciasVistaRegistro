/**
 * POST /api/auth/logout
 *
 * Cierra la sesión del administrador.
 */
import { NextRequest, NextResponse } from "next/server";
import { logout } from "@/server/auth";
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
  await logout();
  return NextResponse.json(
    { ok: true },
    { headers: cabecerasCors(request.headers.get("origin")) }
  );
}
