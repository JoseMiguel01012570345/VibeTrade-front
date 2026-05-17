import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/testResources/setup.ts"],
    globals: true,
    css: false,
    pool: "threads",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["e2e/**", "node_modules/**"],
    server: {
      deps: {
        inline: [/@csstools\//, /@asamuzakjp\//],
      },
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5110",
        changeOrigin: true,
      },
      "/ws": {
        target: "http://localhost:5110",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
