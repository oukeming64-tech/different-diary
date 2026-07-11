import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  root: "github-pages",
  base: "/different-diary/",
  publicDir: "../public",
  plugins: [react()],
  resolve: {
    alias: {
      "next/image": fileURLToPath(
        new URL("./github-pages/next-image.tsx", import.meta.url),
      ),
    },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    outDir: "../dist-pages",
    emptyOutDir: true,
  },
});
