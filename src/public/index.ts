// Headless public API for SQLPlay — `import { createDatabase } from "sqlplay"`.
// The SQLite WASM binary is embedded directly in the bundle (via the build's
// binary loader), so this works in Node and any bundler with zero config.
import wasmBinary from "sql.js/dist/sql-wasm.wasm";
import { configureEngine, InMemoryDatabase } from "../engine/db";

configureEngine({ wasmBinary: wasmBinary as unknown as ArrayBuffer });

/** Create a fresh in-memory SQLite database. */
export function createDatabase(): Promise<InMemoryDatabase> {
  return InMemoryDatabase.create();
}

/** Restore a database from bytes previously produced by `db.export()`. */
export function openDatabase(bytes: Uint8Array): Promise<InMemoryDatabase> {
  return InMemoryDatabase.open(bytes);
}

export { InMemoryDatabase };
export type {
  QueryResult,
  StatementOutcome,
  TableInfo,
  ColumnInfo,
  ForeignKey,
} from "../engine/db";
