// Embeddable React console — `import { SqlConsole } from "sqlplay/react"`.
// Reuses the full console UI; the WASM binary is embedded so no asset serving
// or config is required in the host app. React is a peer dependency.
import wasmBinary from "sql.js/dist/sql-wasm.wasm";
import { configureEngine } from "../engine/db";
import App from "../App";
import "../styles.css";

configureEngine({ wasmBinary: wasmBinary as unknown as ArrayBuffer });

export interface SqlConsoleProps {
  /** Height of the embedded console (CSS length). Default "80vh". */
  height?: string | number;
  /** Extra class on the wrapper element. */
  className?: string;
}

/** The full SQLPlay console, mountable anywhere in a React app. */
export function SqlConsole({ height = "80vh", className }: SqlConsoleProps) {
  return (
    <div
      className={"sqlplay-embed" + (className ? " " + className : "")}
      style={{ height }}
    >
      <App />
    </div>
  );
}

export default SqlConsole;
