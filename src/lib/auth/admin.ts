import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { safeEqual, sign, unsign } from "./sign";

// Sesión del organizador (CLAUDE.md §2): contraseña en ADMIN_PASSWORD y una
// cookie httpOnly firmada que vence sola. No hay usuarios admin en la base.

const COOKIE_NAME = "admin_session";
const SESSION_HOURS = 12;
const PREFIX = "admin:";

export function checkAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    throw new Error("Falta ADMIN_PASSWORD (ver .env.example).");
  }
  return safeEqual(password, expected);
}

export async function startAdminSession(): Promise<void> {
  const maxAge = SESSION_HOURS * 60 * 60;
  const expiresAt = Date.now() + maxAge * 1000;
  (await cookies()).set(COOKIE_NAME, sign(`${PREFIX}${expiresAt}`), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function endAdminSession(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

export async function isAdmin(): Promise<boolean> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return false;
  const value = unsign(token);
  if (!value?.startsWith(PREFIX)) return false;
  const expiresAt = Number(value.slice(PREFIX.length));
  // La hora actual se lee en cada petición, nunca durante el prerender.
  await connection();
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

/**
 * Llamar al inicio de cada página y acción de admin. Si no hay sesión válida,
 * manda al login. Es la verificación real: no depende de ningún middleware.
 */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) {
    redirect("/admin");
  }
}
