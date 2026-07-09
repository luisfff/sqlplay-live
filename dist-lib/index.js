import {
  sql_wasm_default
} from "./chunk-5LYLQ6BZ.js";
import {
  InMemoryDatabase,
  configureEngine
} from "./chunk-NL6X44PU.js";

// src/public/index.ts
configureEngine({ wasmBinary: sql_wasm_default });
function createDatabase() {
  return InMemoryDatabase.create();
}
function openDatabase(bytes) {
  return InMemoryDatabase.open(bytes);
}
export {
  InMemoryDatabase,
  createDatabase,
  openDatabase
};
