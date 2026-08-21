"use client";

import { useTransition } from "react";
import { toggleDriverActive } from "@/lib/actions/drivers";
import { Loader2 } from "lucide-react";

export function ToggleDriverActive({
  driverId,
  active,
}: {
  driverId: string;
  active: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await toggleDriverActive(driverId, !active);
    });
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`shrink-0 text-xs font-medium px-3 h-8 rounded-md border transition-colors disabled:opacity-60 ${
        active
          ? "border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
          : "border-gray-200 text-gray-600 hover:bg-green-50 hover:text-green-600 hover:border-green-200"
      }`}
    >
      {isPending ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : active ? (
        "Desactivar"
      ) : (
        "Activar"
      )}
    </button>
  );
}
