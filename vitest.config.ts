import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      setupFiles: ["./test/setup.ts"],
      globals: true,
      css: false,
      pool: "threads",
      include: ["test/**/*.test.{ts,tsx}"],
      exclude: [
        "test/e2e/Resources/**",
        "test/e2e/global-setup.ts",
        "node_modules/**",
      ],
      server: {
        deps: {
          inline: [/@csstools\//, /@asamuzakjp\//],
        },
      },
    },
  }),
);
