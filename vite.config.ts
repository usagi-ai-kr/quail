import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import solid from "vite-plugin-solid";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [solid(), tailwindcss(), cloudflare()],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: "assets/login.js",
        chunkFileNames: "assets/chunk-[name].js",
        assetFileNames: (asset) => asset.name?.endsWith(".css")
          ? "assets/login.css"
          : "assets/[name][extname]",
      },
    },
  },
});
