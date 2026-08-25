"use client";

import { useState, useRef } from "react";
import { KeyRound, X, Check, Loader2, Eye, EyeOff } from "lucide-react";
import { resetUserPassword } from "@/lib/actions/admin";

export function ResetPasswordButton({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleOpen() {
    setOpen(true);
    setPassword("");
    setError(null);
    setDone(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleClose() {
    setOpen(false);
    setPassword("");
    setError(null);
    setDone(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError(null);

    const result = await resetUserPassword(userId, password);

    setLoading(false);

    if (result.success) {
      setDone(true);
      setTimeout(() => handleClose(), 1500);
    } else {
      setError(result.error ?? "Error al cambiar la contraseña");
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        title="Cambiar contraseña"
        className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
      >
        <KeyRound className="w-4 h-4" />
      </button>

      {/* Panel inline */}
      {open && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={handleClose}
          />

          {/* Popover */}
          <div className="absolute right-0 top-8 z-50 w-72 bg-white border border-gray-200 rounded-xl shadow-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">
                Nueva clave para{" "}
                <span className="text-blue-600">{userName}</span>
              </p>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {done ? (
              <div className="flex items-center gap-2 text-green-600 py-1">
                <Check className="w-4 h-4" />
                <span className="text-sm font-medium">¡Contraseña actualizada!</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="relative">
                  <input
                    ref={inputRef}
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nueva contraseña (mín. 6 caracteres)"
                    className="w-full h-9 rounded-md border border-gray-200 px-3 pr-9 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {error && (
                  <p className="text-xs text-red-600">{error}</p>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 h-8 rounded-md border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading || password.length < 6}
                    className="flex-1 h-8 rounded-md bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                  >
                    {loading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      "Guardar"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
}
