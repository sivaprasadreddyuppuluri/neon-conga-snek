import { defineConfig } from "vitest/config";

export default defineConfig({
  // Relative asset paths, so the build works from any folder or sub-path (e.g. GitHub Pages).
  base: "./",
  test: {
    include: ["tests/unit/**/*.test.ts"],
  },
});
