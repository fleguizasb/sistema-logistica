/**
 * Route handler para NextAuth v5.
 * Maneja GET y POST de /api/auth/* (login, logout, session, etc.)
 */

import { handlers } from "@/auth";

export const { GET, POST } = handlers;
