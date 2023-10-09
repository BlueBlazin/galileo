import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // react(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        enabled: true,
      },
      manifest: {
        name: "Galileo",
        short_name: "Galileo",
        description: "Galileo AI image editor.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: "#000",
        icons: [
          {
            src: "/galileo-icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/galileo-icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
        file_handlers: [
          {
            action: ".",
            accept: {
              "image/png": ".png",
            },
            icons: [
              {
                src: "galileo-icon-192.png",
                sizes: "192x192",
                type: "image/png",
              },
            ],
            launch_type: "single-client",
          },
        ],
      },
    }),
  ],
});
