// Backend-served SQL console — H2-style. Mount as Express/Connect middleware:
//   app.use("/db-console", sqlplay({ database: ":memory:" }))
// The database lives in your Node process; the browser console talks to it
// over a small JSON API served by this same middleware.
import {
  readFileSync,
  writeFileSync,
  existsSync,
  statSync,
  readdirSync,
} from "node:fs";
import { join } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { InMemoryDatabase, splitStatements } from "../engine/db";
import { renderAdminPage } from "./page";

export interface SqlplayServerOptions {
  /** ":memory:" (default) or a path to a .sqlite file to load/persist. */
  database?: string;
  /**
   * Schema/seed SQL to build the database on startup. Each entry may be:
   *  - inline SQL,
   *  - a path to a `.sql` file, or
   *  - a directory (all `*.sql` files run in sorted filename order).
   * Runs when the database is fresh (in-memory, a new file, or resetOnStart).
   */
  init?: string | string[];
  /** For a file database, rebuild from `init` on every start (default false). */
  resetOnStart?: boolean;
  /** Reject anything that isn't a read (SELECT/PRAGMA/EXPLAIN/WITH). */
  readOnly?: boolean;
  /** Cap rows returned per result set (default 1000). */
  maxRows?: number;
  /** Title shown in the console header. */
  title?: string;
}

/** Resolve init entries (inline SQL / file / directory) into one SQL script. */
function resolveInit(init: string | string[]): string {
  const entries = Array.isArray(init) ? init : [init];
  const parts: string[] = [];
  for (const entry of entries) {
    if (existsSync(entry) && statSync(entry).isDirectory()) {
      const files = readdirSync(entry)
        .filter((f) => f.toLowerCase().endsWith(".sql"))
        .sort();
      for (const f of files) parts.push(readFileSync(join(entry, f), "utf8"));
    } else if (existsSync(entry) && statSync(entry).isFile()) {
      parts.push(readFileSync(entry, "utf8"));
    } else {
      parts.push(entry); // treat as inline SQL
    }
  }
  return parts.join("\n;\n");
}

type Req = IncomingMessage & { url?: string; method?: string; body?: unknown };
type Res = ServerResponse;
type Next = (err?: unknown) => void;

const WRITE_KW =
  /\b(insert|update|delete|drop|create|alter|replace|attach|detach|reindex|vacuum|truncate)\b/i;

/**
 * A statement is treated as read-only if it starts with SELECT/PRAGMA/EXPLAIN,
 * or is a CTE (`WITH …`) whose body contains no data-modifying keyword — so
 * `WITH x AS (…) DELETE …` is correctly rejected. This is a pragmatic guard,
 * not a hardened SQL parser: still mount the console behind auth in production.
 */
function isReadOnlyStatement(stmt: string): boolean {
  if (/^\s*(select|pragma|explain)\b/i.test(stmt)) return true;
  if (/^\s*with\b/i.test(stmt) && !WRITE_KW.test(stmt)) return true;
  return false;
}

function json(res: Res, status: number, body: unknown) {
  const text = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(text);
}

function readBody(req: Req): Promise<string> {
  if (req.body !== undefined) {
    return Promise.resolve(
      typeof req.body === "string" ? req.body : JSON.stringify(req.body)
    );
  }
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
    req.on("error", () => resolve(""));
  });
}

/** Convert a cell to something JSON-serializable (blobs → placeholder). */
function cell(v: unknown): unknown {
  if (v instanceof Uint8Array) return `«blob ${v.length}»`;
  return v;
}

export function sqlplay(options: SqlplayServerOptions = {}) {
  const {
    database = ":memory:",
    init,
    resetOnStart = false,
    readOnly = false,
    maxRows = 1000,
    title = "SQLPlay — Server Console",
  } = options;

  let dbPromise: Promise<InMemoryDatabase> | null = null;

  const getDb = () => {
    if (!dbPromise) {
      dbPromise = (async () => {
        const fileExists = database !== ":memory:" && existsSync(database);
        // Load an existing file DB as-is; otherwise build a fresh one from init.
        if (fileExists && !resetOnStart) {
          return InMemoryDatabase.open(
            new Uint8Array(readFileSync(database))
          );
        }
        const db = await InMemoryDatabase.create();
        if (init) {
          const outcomes = db.run(resolveInit(init));
          const failed = outcomes.find((o) => o.error);
          if (failed) {
            throw new Error(
              `sqlplay init failed on: ${failed.sql.slice(0, 80)} — ${failed.error}`
            );
          }
        }
        if (database !== ":memory:") {
          try {
            writeFileSync(database, Buffer.from(db.export()));
          } catch {
            /* best effort */
          }
        }
        return db;
      })();
    }
    return dbPromise;
  };

  const persist = (db: InMemoryDatabase) => {
    if (database !== ":memory:") {
      try {
        writeFileSync(database, Buffer.from(db.export()));
      } catch {
        /* best effort */
      }
    }
  };

  return async function middleware(req: Req, res: Res, next?: Next) {
    const url = (req.url || "/").split("?")[0];
    const isApi = (suffix: string) =>
      url === suffix || url.endsWith(suffix);

    try {
      // Serve the console page at the mount root.
      if (
        req.method === "GET" &&
        (url === "/" || url === "" || url === "/index.html")
      ) {
        const html = renderAdminPage({ title, readOnly });
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(html);
        return;
      }

      if (req.method === "GET" && isApi("/api/schema")) {
        const db = await getDb();
        json(res, 200, { tables: db.schema(), foreignKeys: db.foreignKeys() });
        return;
      }

      if (req.method === "POST" && isApi("/api/query")) {
        const raw = await readBody(req);
        let sql = "";
        try {
          sql = JSON.parse(raw || "{}").sql || "";
        } catch {
          json(res, 400, { error: "Invalid JSON body." });
          return;
        }
        if (readOnly && sql.trim()) {
          // Check EVERY statement, not just the start of the script, so
          // "SELECT 1; DROP TABLE t;" cannot slip a write past the guard.
          const offending = splitStatements(sql).find(
            (s) => !isReadOnlyStatement(s)
          );
          if (offending) {
            json(res, 403, {
              error:
                "This console is read-only; only SELECT/PRAGMA/EXPLAIN/WITH statements are allowed.",
            });
            return;
          }
        }
        const db = await getDb();
        const outcomes = db.run(sql).map((o) => ({
          sql: o.sql,
          error: o.error,
          rowsModified: o.rowsModified,
          elapsedMs: o.elapsedMs,
          columns: o.result?.columns ?? null,
          rows: o.result
            ? o.result.rows.slice(0, maxRows).map((r) => r.map(cell))
            : null,
          truncated: o.result ? o.result.rows.length > maxRows : false,
        }));
        if (!readOnly && outcomes.some((o) => !o.error && o.rowsModified > 0)) {
          persist(db);
        }
        json(res, 200, { outcomes });
        return;
      }

      if (next) return next();
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
    } catch (err) {
      json(res, 500, {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };
}

export default sqlplay;
