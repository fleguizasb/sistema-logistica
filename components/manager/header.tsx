"use client";

import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { LogOut, User, ChevronDown } from "lucide-react";

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { data: session } = useSession();

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" });
  };

  return (
    <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-6 shrink-0">
      <h1 className="text-base font-semibold text-gray-900">{title}</h1>

      {/* Menú de usuario */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <span className="font-medium hidden sm:block">
              {session?.user?.name ?? "Usuario"}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={8}
            className="z-50 min-w-[180px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg p-1 animate-in fade-in-0 zoom-in-95"
          >
            <div className="px-3 py-2 border-b border-gray-100 mb-1">
              <p className="text-xs font-medium text-gray-900">
                {session?.user?.name}
              </p>
              <p className="text-xs text-gray-500">{session?.user?.email}</p>
            </div>

            <DropdownMenu.Item
              onSelect={handleSignOut}
              className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 rounded-lg cursor-pointer hover:bg-red-50 focus:outline-none focus:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </header>
  );
}
