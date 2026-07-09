import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The SQLite `.wasm` is imported with `?url` (see src/engine/wasm-app.ts), so
// Vite emits and serves it as an asset in both dev and build.
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist",
    target: "es2022",
  },
  optimizeDeps: {
    // sql.js is a CommonJS/UMD module. It MUST be pre-bundled so esbuild adds
    // the CJS→ESM interop that gives it a `default` export. Excluding it here
    // makes `npm run dev` fail with "does not provide an export named 'default'"
    // even though the production build (Rollup interop) works fine.
    include: ["sql.js"],
  },
});
