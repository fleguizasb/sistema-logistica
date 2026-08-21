import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Logística SleepBox",
    short_name: "SleepBox",
    description: "Sistema de gestión logística SleepBox",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f9fafb",
    theme_color: "#1e3a6e",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
