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
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, "index.html"),
        popup: path.resolve(__dirname, "popup.html"),
        demo: path.resolve(__dirname, "demo.html"),
        aadhaarDemo: path.resolve(__dirname, "aadhaar-demo.html"),
        background: path.resolve(__dirname, "src/background/index.ts")
      },
      output: {
        entryFileNames: (chunk) => (chunk.name === "background" ? "background.js" : "[name].js"),
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]"
      }
    }
  }
});
