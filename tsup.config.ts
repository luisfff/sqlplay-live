import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/public/index.ts",
    react: "src/public/react.tsx",
    server: "src/server/index.ts",
  },
  outDir: "dist-lib",
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: false,
  // Inject the component CSS at runtime so consumers don't import a stylesheet.
  injectStyle: true,
  // Bundle the WASM asset into the output; keep sql.js itself external so it
  // resolves from the consumer's node_modules (installed transitively).
  noExternal: ["sql.js/dist/sql-wasm.wasm"],
  external: ["react", "react-dom"],
  esbuildOptions(options) {
    options.loader = { ...options.loader, ".wasm": "binary" };
  },
});
