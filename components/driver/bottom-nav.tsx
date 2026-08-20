"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ClipboardList, Navigation, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

const navItems = [
  { label: "Mis pedidos", href: "/assignments", icon: ClipboardList },
  { label: "Recorrido", href: "/route", icon: Navigation },
];

export function DriverBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center safe-area-pb z-40">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
              isActive ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <item.icon
              className={cn("w-5 h-5", isActive ? "text-blue-600" : "text-gray-400")}
            />
            {item.label}
          </Link>
        );
      })}

      {/* Botón de logout */}
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
      >
        <LogOut className="w-5 h-5 text-gray-400" />
        Salir
      </button>
    </nav>
  );
}
