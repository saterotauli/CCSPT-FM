// @ts-nocheck
/* eslint-disable import/no-extraneous-dependencies */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  base: "./",
  esbuild: {
    supported: {
      "top-level-await": true,
    },
  },
  resolve: {
    alias: {
      "@app": fileURLToPath(new URL("./src/app", import.meta.url)),
      "@features": fileURLToPath(new URL("./src/features", import.meta.url)),
      "@shared": fileURLToPath(new URL("./src/shared", import.meta.url)),
      "@viewer": fileURLToPath(new URL("./src/viewer", import.meta.url)),
      "@bim": fileURLToPath(new URL("./src/bim", import.meta.url)),
      "@utils": fileURLToPath(new URL("./src/utils", import.meta.url)),
      "@ui": fileURLToPath(new URL("./src/ui-templates", import.meta.url)),
      "@styles": fileURLToPath(new URL("./src/shared/styles", import.meta.url)),
    },
  },
  server: {
    host: true, // listen on LAN so mobile can access via http://<PC-IP>:5173
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 5173,
  },
});
