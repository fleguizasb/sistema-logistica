"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Package, PlusCircle, LogOut, User } from "lucide-react";

interface Props {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
}

const nav = [
  { href: "/orders", label: "Mis pedidos", icon: Package },
  { href: "/orders/new", label: "Nuevo pedido", icon: PlusCircle },
];

export default function RequesterSidebar({ user }: Props) {
  const pathname = usePathname();

  return (
    <aside className="h-full bg-white border-r flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b">
        <span className="font-bold text-lg text-gray-900">Logística</span>
        <p className="text-xs text-gray-400 mt-0.5">Panel de pedidos</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/orders" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer usuario */}
      <div className="border-t px-4 py-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <User size={16} className="text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2 w-full text-sm text-gray-500 hover:text-red-600 transition-colors px-1"
        >
          <LogOut size={15} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
