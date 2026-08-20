/**
 * Middleware de protección de rutas por rol.
 *
 * Rutas públicas:  /login, /tracking/*
 * Rutas MANAGER:  /dashboard, /shipments, /labels, /drivers, /incidents
 * Rutas DRIVER:   /assignments, /route/*
 * Raíz (/):       redirige al panel correspondiente según rol
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Prefijos de rutas públicas (sin autenticación requerida)
const PUBLIC_PATHS = ["/login", "/tracking"];

// Prefijos de rutas exclusivas para MANAGER
const MANAGER_PATHS = ["/dashboard", "/shipments", "/labels", "/drivers", "/incidents"];

// Prefijos de rutas exclusivas para DRIVER
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

export default auth((req: NextRequest & { auth: { user?: { role?: string } } | null }) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;
  const isLoggedIn = !!session?.user;
  const role = session?.user?.role;

  // Rutas públicas: siempre accesibles
  if (isPublicPath(pathname)) {
    // Si ya está logueado e intenta ir al login, redirigir al panel
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
  // Aplica el middleware a todas las rutas excepto archivos estáticos y API de auth
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
