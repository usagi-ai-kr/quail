import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

const TEST_PASERK = "k4.local.AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        vars: {
          PASSWORD: "test-only-password",
          PASETO_KEY: TEST_PASERK,
        },
      },
    }),
  ],
  test: {
    include: ["tests/{client,domain,server}/**/*.test.ts"],
    fileParallelism: false,
  },
});
