import { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      isOwner: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    isOwner: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    isOwner: boolean;
  }
}
