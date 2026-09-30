import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Same-origin API during development, like production.
    // Set UMOVE_API to use another API (default: the local one on port 3000).
    proxy: {
      "/api": {
        target: process.env.UMOVE_API ?? "http://localhost:3000",
        configure(proxy) {
          // API not running: answer with JSON so the app shows "can't reach the server".
          proxy.on("error", (_err, _req, res) => {
            if ("writeHead" in res && !res.headersSent) {
              res.writeHead(503, { "content-type": "application/json" });
              res.end(JSON.stringify({ error: "api_offline" }));
            }
          });
        },
      },
    },
  },
  build: {
    sourcemap: false,
    // Never inline assets as data: URIs; the Content Security Policy only
    // allows fonts and scripts from UMove itself.
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        // React and the router change rarely: a separate file stays cached across UMOVE updates.
        manualChunks(id) {
          if (/node_modules[\\/](react|react-dom|scheduler|react-router)[\\/]/.test(id)) return "vendor";
        },
      },
    },
  },
});
