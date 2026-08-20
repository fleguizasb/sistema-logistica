import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { ShipmentStatus } from "@prisma/client";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-gray-100 text-gray-700",
        blue: "bg-blue-100 text-blue-700",
        green: "bg-green-100 text-green-700",
        yellow: "bg-yellow-100 text-yellow-700",
        red: "bg-red-100 text-red-700",
        orange: "bg-orange-100 text-orange-700",
        purple: "bg-purple-100 text-purple-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

// Mapa de estados a variantes visuales
const STATUS_VARIANT: Record<ShipmentStatus, VariantProps<typeof badgeVariants>["variant"]> = {
  EN_PREPARACION: "default",
  LISTO_PARA_ENVIAR: "blue",
  ASIGNADO_CHOFER: "purple",
  EN_CAMINO: "yellow",
  ENTREGADO: "green",
  INCIDENCIA: "red",
  CANCELADO: "orange",
};

const STATUS_LABEL: Record<ShipmentStatus, string> = {
  EN_PREPARACION: "En preparación",
  LISTO_PARA_ENVIAR: "Listo para enviar",
  ASIGNADO_CHOFER: "Asignado a chofer",
  EN_CAMINO: "En camino",
  ENTREGADO: "Entregado",
  INCIDENCIA: "Incidencia",
  CANCELADO: "Cancelado",
};

interface StatusBadgeProps {
  status: ShipmentStatus;
  className?: string;
}

function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge variant={STATUS_VARIANT[status]} className={className}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

export { Badge, badgeVariants, StatusBadge, STATUS_LABEL, STATUS_VARIANT };
