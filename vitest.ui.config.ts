import solid from "vite-plugin-solid";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [solid()],
  resolve: {
    conditions: ["development", "browser"],
  },
  test: {
    include: ["tests/ui/**/*.test.tsx"],
    environment: "jsdom",
    fileParallelism: false,
  },
});
