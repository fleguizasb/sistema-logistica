import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const isLoggedIn = !!session;

  const path = nextUrl.pathname;

  // Rutas públicas: no requieren auth
  if (path.startsWith("/tracking") || path.startsWith("/api/tracking")) {
    return NextResponse.next();
  }

  // API routes de NextAuth
  if (path.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const isLoginPage = path === "/login" || path.startsWith("/login");

  // No autenticado → login
  if (!isLoggedIn) {
    if (isLoginPage) return NextResponse.next();
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role = session?.user?.role;

  // Ya autenticado → redirigir lejos del login
  if (isLoginPage) {
    if (role === "MANAGER") return NextResponse.redirect(new URL("/dashboard", req.url));
    if (role === "DRIVER") return NextResponse.redirect(new URL("/assignments", req.url));
    if (role === "SOLICITANTE") return NextResponse.redirect(new URL("/orders", req.url));
    return NextResponse.redirect(new URL("/", req.url));
  }

  // ─── Rutas del gestor ─────────────────────────────────────────────────────
  const isManagerRoute =
    path.startsWith("/dashboard") ||
    path.startsWith("/shipments") ||
    path.startsWith("/drivers") ||
    path.startsWith("/incidents") ||
    path.startsWith("/logistics") ||
    path.startsWith("/admin") ||
    path.startsWith("/perfil");

  if (isManagerRoute && role !== "MANAGER") {
    if (role === "DRIVER") return NextResponse.redirect(new URL("/assignments", req.url));
    if (role === "SOLICITANTE") return NextResponse.redirect(new URL("/orders", req.url));
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // ─── Rutas del chofer ─────────────────────────────────────────────────────
  const isDriverRoute =
    path.startsWith("/assignments") ||
    path.startsWith("/route");

  if (isDriverRoute && role !== "DRIVER") {
    if (role === "MANAGER") return NextResponse.redirect(new URL("/dashboard", req.url));
    if (role === "SOLICITANTE") return NextResponse.redirect(new URL("/orders", req.url));
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // ─── Rutas del solicitante ────────────────────────────────────────────────
  const isRequesterRoute = path.startsWith("/orders");

  if (isRequesterRoute && role !== "SOLICITANTE" && role !== "MANAGER") {
    // El gestor también puede ver /orders (vista de todos los pedidos)
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
