import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    css: false,
  },
  css: {
    postcss: "",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "../.."),
      "@payment-api": path.resolve(__dirname, "src"),
    },
  },
})
