import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src")
    }
  },
  build: {
    outDir: "dist",
    emptyOutDir: false,
    sourcemap: true,
    rollupOptions: {
      input: path.resolve(__dirname, "src/content/index.tsx"),
      output: {
        format: "iife",
        name: "NeuroAdaptContentScript",
        inlineDynamicImports: true,
        entryFileNames: "contentScript.js",
        assetFileNames: "assets/[name]-[hash][extname]"
      }
    }
  }
});
