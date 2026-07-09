// App-only WASM loader: Vite resolves this import to a served URL for the
// SQLite WebAssembly binary. Kept out of the shared engine so the published
// library (which embeds the binary instead) doesn't depend on Vite features.
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import { configureEngine } from "./db";

export function configureAppEngine(): void {
  configureEngine({ locateFile: () => wasmUrl });
}
