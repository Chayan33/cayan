import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || "/",
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/socket.io": { target: "http://127.0.0.1:3001", ws: true },
      "/api": "http://127.0.0.1:3001",
    },
  },
  build: {
    outDir: mode === "portable" ? "dist-portable" : "dist",
    assetsInlineLimit: mode === "portable" ? 2000000 : 4096,
    rollupOptions: {
      output:
        mode === "portable"
          ? { inlineDynamicImports: true }
          : {
              manualChunks: {
                three: ["three"],
                react: ["react", "react-dom"],
                network: ["socket.io-client"],
              },
            },
    },
  },
}));
