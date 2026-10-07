import { NextRequest, NextResponse } from "next/server";

// Rutas públicas que no requieren autenticación
const PUBLIC_PREFIXES = ["/tracking", "/api/tracking", "/api/auth"];

// Nombres posibles del cookie de sesión de NextAuth / Auth.js
const SESSION_COOKIE_NAMES = [
  "__Secure-authjs.session-token",
  "authjs.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rutas públicas → pasar siempre
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const isLoggedIn = SESSION_COOKIE_NAMES.some((name) =>
    req.cookies.has(name)
  );
  const isLoginPage = pathname === "/login" || pathname.startsWith("/login/");

  // No autenticado → redirigir a login (salvo que ya esté ahí)
  if (!isLoggedIn) {
    if (isLoginPage) return NextResponse.next();
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Autenticado en login → ir a home (app/page.tsx hace el redirect por rol)
  if (isLoginPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
