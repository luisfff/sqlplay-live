import initSqlJs, {
  type Database,
  type SqlJsStatic,
  type SqlJsConfig,
} from "sql.js";

let SQL: SqlJsStatic | null = null;
let engineConfig: SqlJsConfig | undefined;

/**
 * Configure how the SQLite WASM binary is located/loaded. Different entry
 * points supply this differently:
 *  - the Vite app passes a served URL via `locateFile`
 *  - the published library passes an embedded `wasmBinary`
 * Must be called before the first `initEngine()`.
 */
export function configureEngine(config: SqlJsConfig): void {
  engineConfig = config;
}

/** Load the SQLite WASM engine once and cache it. */
export async function initEngine(): Promise<SqlJsStatic> {
  if (!SQL) {
    SQL = await initSqlJs(engineConfig);
  }
  return SQL;
}

export interface QueryResult {
  columns: string[];
  rows: unknown[][];
}

export interface StatementOutcome {
  /** The SQL text of the statement that produced this outcome. */
  sql: string;
  /** Result set, if the statement returned rows. */
  result: QueryResult | null;
  /** Rows changed by INSERT/UPDATE/DELETE for this batch. */
  rowsModified: number;
  elapsedMs: number;
  error: string | null;
}

export interface ColumnInfo {
  name: string;
  type: string;
  pk: boolean;
  notNull: boolean;
}

export interface TableInfo {
  name: string;
  kind: "table" | "view";
  columns: ColumnInfo[];
  rowCount: number;
}

export interface ForeignKey {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
}

/**
 * A thin, UI-friendly wrapper around a single in-memory SQLite database.
 * This is the JS equivalent of an H2 in-memory database instance.
 */
export class InMemoryDatabase {
  private db: Database;

  private constructor(db: Database) {
    this.db = db;
  }

  static async create(): Promise<InMemoryDatabase> {
    const engine = await initEngine();
    return new InMemoryDatabase(new engine.Database());
  }

  /** Restore a database from previously exported bytes. */
  static async open(bytes: Uint8Array): Promise<InMemoryDatabase> {
    const engine = await initEngine();
    return new InMemoryDatabase(new engine.Database(bytes));
  }

  /**
   * Run a script that may contain multiple statements. Each statement is
   * executed in order; the first error stops the batch (like most consoles).
   */
  run(script: string): StatementOutcome[] {
    const statements = splitStatements(script);
    const outcomes: StatementOutcome[] = [];

    for (const sql of statements) {
      const start = performance.now();
      try {
        const raw = this.db.exec(sql);
        const elapsedMs = performance.now() - start;
        const result: QueryResult | null =
          raw.length > 0
            ? { columns: raw[0].columns, rows: raw[0].values }
            : null;
        outcomes.push({
          sql,
          result,
          rowsModified: this.db.getRowsModified(),
          elapsedMs,
          error: null,
        });
      } catch (err) {
        outcomes.push({
          sql,
          result: null,
          rowsModified: 0,
          elapsedMs: performance.now() - start,
          error: err instanceof Error ? err.message : String(err),
        });
        break;
      }
    }

    return outcomes;
  }

  /** Introspect the current schema (tables, views, columns, row counts). */
  schema(): TableInfo[] {
    const listing = this.db.exec(
      `SELECT name, type FROM sqlite_master
       WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%'
       ORDER BY type, name`
    );
    if (listing.length === 0) return [];

    const tables: TableInfo[] = [];
    for (const [name, type] of listing[0].values as [string, string][]) {
      const columns: ColumnInfo[] = [];
      const info = this.db.exec(`PRAGMA table_info("${name}")`);
      if (info.length > 0) {
        for (const row of info[0].values) {
          // PRAGMA table_info => cid, name, type, notnull, dflt_value, pk
          columns.push({
            name: String(row[1]),
            type: String(row[2] || ""),
            notNull: Number(row[3]) === 1,
            pk: Number(row[5]) > 0,
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
        rowCount,
      });
    }
    return tables;
  }

  /** All foreign-key relationships across the schema (for the ER diagram). */
  foreignKeys(): ForeignKey[] {
    const fks: ForeignKey[] = [];
    const tables = this.db.exec(
      `SELECT name FROM sqlite_master
       WHERE type='table' AND name NOT LIKE 'sqlite_%'`
    );
    if (tables.length === 0) return fks;
    for (const [name] of tables[0].values as [string][]) {
      let list;
      try {
        list = this.db.exec(`PRAGMA foreign_key_list("${name}")`);
      } catch {
        continue;
      }
      if (list.length === 0) continue;
      for (const row of list[0].values) {
        // PRAGMA foreign_key_list => id, seq, table, from, to, ...
        fks.push({
          fromTable: name,
          fromColumn: String(row[3]),
          toTable: String(row[2]),
          toColumn: String(row[4] ?? ""),
        });
      }
    }
    return fks;
  }

  /** Run a single read query and return one result set (or null). */
  query(sql: string): QueryResult | null {
    const r = this.db.exec(sql);
    return r.length > 0 ? { columns: r[0].columns, rows: r[0].values } : null;
  }

  /** Run a parameterized write statement (UPDATE/INSERT/DELETE). */
  mutate(sql: string, params: unknown[] = []): void {
    this.db.run(sql, params as never[]);
  }

  /** Serialize the whole database to bytes (for export / persistence). */
  export(): Uint8Array {
    return this.db.export();
  }

  /** Drop everything and start fresh. */
  reset(): void {
    this.db.close();
    // Caller should replace the instance; kept simple for the console.
  }
}

/** The last result set produced by a batch (used for challenge grading). */
export function lastResultSet(outcomes: StatementOutcome[]): QueryResult | null {
  for (let i = outcomes.length - 1; i >= 0; i--) {
    if (outcomes[i].result) return outcomes[i].result;
  }
  return null;
}

/**
 * Split a SQL script into individual statements on top-level semicolons,
 * respecting single/double quotes and -- / block comments.
 */
export function splitStatements(script: string): string[] {
  const out: string[] = [];
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
