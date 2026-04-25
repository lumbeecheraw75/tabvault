import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { copyFileSync, mkdirSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    {
      name: "copy-alphatab-assets",
      closeBundle() {
        const atDir = resolve(__dirname, "node_modules/@coderline/alphatab/dist");
        const outDir = resolve(__dirname, "dist/assets");
        mkdirSync(outDir, { recursive: true });
        readdirSync(atDir).forEach(f => {
          if (f.endsWith(".mjs") || f.endsWith(".js")) {
            copyFileSync(resolve(atDir, f), resolve(outDir, f));
            console.log("Copied " + f);
          }
        });
      }
    }
  ],
  server: {
    proxy: { "/api": "http://localhost:3001" }
  },
  optimizeDeps: {
    exclude: ["@coderline/alphatab"]
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      output: {
        manualChunks: { alphatab: ["@coderline/alphatab"] }
      }
    }
  }
});
