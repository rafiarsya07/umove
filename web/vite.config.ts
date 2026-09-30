import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Same-origin API during development, like production.
    proxy: { "/api": "http://localhost:3000" },
  },
  build: {
    sourcemap: false,
    // Never inline assets as data: URIs; the Content Security Policy only
    // allows fonts and scripts from UMove itself.
    assetsInlineLimit: 0,
  },
});
