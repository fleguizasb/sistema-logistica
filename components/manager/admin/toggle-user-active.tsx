"use client";

import { useState } from "react";
import { toggleUserActive } from "@/lib/actions/admin";

export function ToggleUserActive({
  userId,
  active,
}: {
  userId: string;
  active: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [currentActive, setCurrentActive] = useState(active);

  async function handleToggle() {
    setLoading(true);
    const result = await toggleUserActive(userId, !currentActive);
    if (result.success) {
      setCurrentActive((prev) => !prev);
    } else {
      alert(result.error ?? "Error al cambiar el estado");
    }
    setLoading(false);
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      title={currentActive ? "Desactivar usuario" : "Activar usuario"}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
        currentActive ? "bg-blue-600" : "bg-gray-200"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          currentActive ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}
