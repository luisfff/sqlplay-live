var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toBinaryNode = Uint8Array.fromBase64 || ((base64) => new Uint8Array(Buffer.from(base64, "base64")));

// src/engine/db.ts
import initSqlJs from "sql.js";
var SQL = null;
var engineConfig;
function configureEngine(config) {
  engineConfig = config;
}
async function initEngine() {
  if (!SQL) {
    SQL = await initSqlJs(engineConfig);
  }
  return SQL;
}
var InMemoryDatabase = class _InMemoryDatabase {
  db;
  constructor(db) {
    this.db = db;
  }
  static async create() {
    const engine = await initEngine();
    return new _InMemoryDatabase(new engine.Database());
  }
  /** Restore a database from previously exported bytes. */
  static async open(bytes) {
    const engine = await initEngine();
    return new _InMemoryDatabase(new engine.Database(bytes));
  }
  /**
   * Run a script that may contain multiple statements. Each statement is
   * executed in order; the first error stops the batch (like most consoles).
   */
  run(script) {
    const statements = splitStatements(script);
    const outcomes = [];
    for (const sql of statements) {
      const start = performance.now();
      try {
        const raw = this.db.exec(sql);
        const elapsedMs = performance.now() - start;
        const result = raw.length > 0 ? { columns: raw[0].columns, rows: raw[0].values } : null;
        outcomes.push({
          sql,
          result,
          rowsModified: this.db.getRowsModified(),
          elapsedMs,
          error: null
        });
      } catch (err) {
        outcomes.push({
          sql,
          result: null,
          rowsModified: 0,
          elapsedMs: performance.now() - start,
          error: err instanceof Error ? err.message : String(err)
        });
        break;
      }
    }
    return outcomes;
  }
  /** Introspect the current schema (tables, views, columns, row counts). */
  schema() {
    const listing = this.db.exec(
      `SELECT name, type FROM sqlite_master
       WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%'
       ORDER BY type, name`
    );
    if (listing.length === 0) return [];
    const tables = [];
    for (const [name, type] of listing[0].values) {
      const columns = [];
      const info = this.db.exec(`PRAGMA table_info("${name}")`);
      if (info.length > 0) {
        for (const row of info[0].values) {
          columns.push({
            name: String(row[1]),
            type: String(row[2] || ""),
            notNull: Number(row[3]) === 1,
            pk: Number(row[5]) > 0
          });
        }
      }
      let rowCount = 0;
      try {
        const count = this.db.exec(`SELECT COUNT(*) FROM "${name}"`);
        rowCount = Number(count[0]?.values[0]?.[0] ?? 0);
      } catch {
        rowCount = 0;
      }
      tables.push({
        name,
        kind: type === "view" ? "view" : "table",
        columns,
        rowCount
      });
    }
    return tables;
  }
  /** All foreign-key relationships across the schema (for the ER diagram). */
  foreignKeys() {
    const fks = [];
    const tables = this.db.exec(
      `SELECT name FROM sqlite_master
       WHERE type='table' AND name NOT LIKE 'sqlite_%'`
    );
    if (tables.length === 0) return fks;
    for (const [name] of tables[0].values) {
      let list;
      try {
        list = this.db.exec(`PRAGMA foreign_key_list("${name}")`);
      } catch {
        continue;
      }
      if (list.length === 0) continue;
      for (const row of list[0].values) {
        fks.push({
          fromTable: name,
          fromColumn: String(row[3]),
          toTable: String(row[2]),
          toColumn: String(row[4] ?? "")
        });
      }
    }
    return fks;
  }
  /** Run a single read query and return one result set (or null). */
  query(sql) {
    const r = this.db.exec(sql);
    return r.length > 0 ? { columns: r[0].columns, rows: r[0].values } : null;
  }
  /** Run a parameterized write statement (UPDATE/INSERT/DELETE). */
  mutate(sql, params = []) {
    this.db.run(sql, params);
  }
  /** Serialize the whole database to bytes (for export / persistence). */
  export() {
    return this.db.export();
  }
  /** Drop everything and start fresh. */
  reset() {
    this.db.close();
  }
};
function lastResultSet(outcomes) {
  for (let i = outcomes.length - 1; i >= 0; i--) {
    if (outcomes[i].result) return outcomes[i].result;
  }
  return null;
}
function splitStatements(script) {
  const out = [];
  let current = "";
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;
  for (let i = 0; i < script.length; i++) {
    const ch = script[i];
    const next = script[i + 1];
    if (inLineComment) {
      current += ch;
      if (ch === "\n") inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      current += ch;
      if (ch === "*" && next === "/") {
        current += next;
        i++;
        inBlockComment = false;
      }
      continue;
    }
    if (!inSingle && !inDouble) {
      if (ch === "-" && next === "-") {
        inLineComment = true;
        current += ch;
        continue;
      }
      if (ch === "/" && next === "*") {
        inBlockComment = true;
        current += ch;
        continue;
      }
    }
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    if (ch === ";" && !inSingle && !inDouble) {
      const trimmed = current.trim();
      if (trimmed) out.push(trimmed);
      current = "";
      continue;
    }
    current += ch;
  }
  const tail = current.trim();
  if (tail) out.push(tail);
  return out;
}

export {
  __commonJS,
  __toESM,
  __toBinaryNode,
  configureEngine,
  InMemoryDatabase,
  lastResultSet,
  splitStatements
};
