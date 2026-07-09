// The library build (tsup/esbuild) inlines *.wasm as a Uint8Array via the
// "binary" loader. This ambient declaration gives it a type for `tsc`/dts.
declare module "*.wasm" {
  const bytes: Uint8Array;
  export default bytes;
}
