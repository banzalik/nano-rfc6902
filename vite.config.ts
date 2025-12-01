import { defineConfig } from "vite";
import { resolve } from "path";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    dts({
      // Only generate types for public entry points (avoid tests/internal folders)
      include: ["src/index.ts", "src/isSafeApply.ts"],
      // Exclude all test sources under src
      exclude: ["src/tests/**", "src/utils/tests/**", "**/*.test.ts"],
      // Emit a .d.ts per public entry (no rollup) at project root
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        isSafeApply: resolve(__dirname, "src/isSafeApply.ts"),
      },
      name: "NanoRFC6902",
      formats: ["es", "cjs"],
      // Emit file per entry name
      fileName: (format, entryName) =>
        `${entryName}.${format === "es" ? "js" : "cjs"}`,
    },
    rollupOptions: {
      external: [],
      output: {
        exports: "named",
      },
    },
    target: "es2020",
    sourcemap: false,
  },
});
