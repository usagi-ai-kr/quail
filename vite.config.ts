import { cloudflare } from "@cloudflare/vite-plugin";
import solid from "vite-plugin-solid";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [solid(), cloudflare()],
});
