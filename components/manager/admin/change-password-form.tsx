"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { changeMyPassword } from "@/lib/actions/profile";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas nuevas no coinciden");
      return;
    }

    if (newPassword.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);

    const result = await changeMyPassword(currentPassword, newPassword);

    setLoading(false);

    if (result.success) {
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      setError(result.error ?? "Error al cambiar la contraseña");
    }
  }

  if (success) {
    return (
      <div className="flex items-center gap-2 text-green-600 py-2">
        <CheckCircle2 className="w-5 h-5" />
        <span className="text-sm font-medium">¡Contraseña actualizada correctamente!</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Contraseña actual */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          Contraseña actual
        </label>
        <div className="relative">
          <input
            type={showCurrent ? "text" : "password"}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            placeholder="Tu contraseña actual"
            className="w-full h-9 rounded-md border border-gray-200 px-3 pr-9 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => setShowCurrent((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Nueva contraseña */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          Nueva contraseña
        </label>
        <div className="relative">
          <input
            type={showNew ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            placeholder="Mínimo 6 caracteres"
            className="w-full h-9 rounded-md border border-gray-200 px-3 pr-9 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => setShowNew((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Confirmar nueva contraseña */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          Confirmar nueva contraseña
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          placeholder="Repetí la nueva contraseña"
          className="w-full h-9 rounded-md border border-gray-200 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || !currentPassword || !newPassword || !confirmPassword}
        className="w-full h-10 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Actualizando...
          </>
        ) : (
          "Cambiar contraseña"
        )}
      </button>
    </form>
  );
}
