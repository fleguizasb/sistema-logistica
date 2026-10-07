// Implementación de toast sin dependencias externas
type ToastOptions = { description?: string };

function show(message: string, type: "success" | "error" | "info", _opts?: ToastOptions) {
  if (typeof document === "undefined") return;

  const el = document.createElement("div");
  const bg =
    type === "success" ? "#16a34a" : type === "error" ? "#dc2626" : "#2563eb";

  el.setAttribute(
    "style",
    [
      "position:fixed",
      "bottom:24px",
      "right:24px",
      "z-index:9999",
      `background:${bg}`,
      "color:white",
      "padding:12px 18px",
      "border-radius:10px",
      "font-size:14px",
      "font-weight:500",
      "box-shadow:0 4px 16px rgba(0,0,0,.18)",
      "transition:opacity .3s",
      "max-width:320px",
      "line-height:1.4",
    ].join(";")
  );
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 320);
  }, 3200);
}

export const toast = Object.assign(
  (msg: string, opts?: ToastOptions) => show(msg, "info", opts),
  {
    success: (msg: string, opts?: ToastOptions) => show(msg, "success", opts),
    error:   (msg: string, opts?: ToastOptions) => show(msg, "error",   opts),
    info:    (msg: string, opts?: ToastOptions) => show(msg, "info",    opts),
    warning: (msg: string, opts?: ToastOptions) => show(msg, "info",    opts),
  }
);
