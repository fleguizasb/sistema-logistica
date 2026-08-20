/**
 * Middleware de protección de rutas por rol.
 * Usa auth.config.ts (sin Prisma/bcrypt) para mantenerse dentro del límite Edge.
 *
 * Rutas públicas:  /login, /tracking/*
 * Rutas MANAGER:  /dashboard, /shipments, /labels, /drivers, /incidents
 * Rutas DRIVER:   /assignments, /route/*
 * Raíz (/):       redirige al panel correspondiente según rol
 */

import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = ["/login", "/tracking"];
const MANAGER_PATHS = ["/dashboard", "/shipments", "/labels", "/drivers", "/incidents"];
const DRIVER_PATHS = ["/assignments", "/route"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}
function isManagerPath(pathname: string): boolean {
  return MANAGER_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}
function isDriverPath(pathname: string): boolean {
  return DRIVER_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const isLoggedIn = !!session?.user;
  const role = (session?.user as { role?: string } | null)?.role;

  // Rutas públicas: siempre accesibles
  if (isPublicPath(pathname)) {
    if (pathname === "/login" && isLoggedIn) {
      const dest = role === "MANAGER" ? "/dashboard" : "/assignments";
      return NextResponse.redirect(new URL(dest, req.url));
    }
    return NextResponse.next();
  }

  // No autenticado → login
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Raíz: redirigir según rol
  if (pathname === "/") {
    const dest = role === "MANAGER" ? "/dashboard" : "/assignments";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  // Ruta de MANAGER accedida por DRIVER
  if (isManagerPath(pathname) && role !== "MANAGER") {
    return NextResponse.redirect(new URL("/assignments", req.url));
  }

  // Ruta de DRIVER accedida por MANAGER
  if (isDriverPath(pathname) && role !== "DRIVER") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
