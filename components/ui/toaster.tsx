"use client";

/**
 * Sistema de toast notifications.
 * Uso: import { toast } from "@/lib/toast"
 *      toast.success("Envío creado")
 *      toast.error("Error al guardar")
 */

import * as React from "react";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:max-w-[380px]",
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & {
    variant?: "default" | "success" | "error";
  }
>(({ className, variant = "default", ...props }, ref) => (
  <ToastPrimitives.Root
    ref={ref}
    className={cn(
      "group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl border p-4 shadow-lg transition-all",
      "data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none",
      "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:slide-in-from-bottom-full",
      variant === "default" && "bg-white border-gray-200 text-gray-900",
      variant === "success" && "bg-green-50 border-green-200 text-green-900",
      variant === "error" && "bg-red-50 border-red-200 text-red-900",
      className
    )}
    {...props}
  />
));
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold", className)}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm opacity-80 mt-0.5", className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-md p-1 opacity-0 transition-opacity group-hover:opacity-100",
      "hover:bg-black/5 focus:opacity-100 focus:outline-none focus:ring-1 focus:ring-gray-400",
      className
    )}
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

// Hook y estado global del toaster
type ToastData = {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "success" | "error";
  duration?: number;
};

let toastState: ToastData[] = [];
let listeners: Array<(toasts: ToastData[]) => void> = [];

function notify(listeners: Array<(toasts: ToastData[]) => void>, toasts: ToastData[]) {
  listeners.forEach((l) => l(toasts));
}

export const toast = {
  show(data: Omit<ToastData, "id">) {
    const t: ToastData = { id: Math.random().toString(36).slice(2), ...data };
    toastState = [...toastState, t];
    notify(listeners, toastState);
    return t.id;
  },
  success(title: string, description?: string) {
    return this.show({ title, description, variant: "success" });
  },
  error(title: string, description?: string) {
    return this.show({ title, description, variant: "error" });
  },
  dismiss(id: string) {
    toastState = toastState.filter((t) => t.id !== id);
    notify(listeners, toastState);
  },
};

function useToasts() {
  const [toasts, setToasts] = React.useState<ToastData[]>(toastState);
  React.useEffect(() => {
    listeners.push(setToasts);
    return () => {
      listeners = listeners.filter((l) => l !== setToasts);
    };
  }, []);
  return toasts;
}

export function Toaster() {
  const toasts = useToasts();

  return (
    <ToastProvider swipeDirection="right">
      {toasts.map((t) => (
        <Toast key={t.id} variant={t.variant} duration={t.duration ?? 4000} onOpenChange={(open) => { if (!open) toast.dismiss(t.id); }}>
          <div className="flex-1">
            <ToastTitle>{t.title}</ToastTitle>
            {t.description && <ToastDescription>{t.description}</ToastDescription>}
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
