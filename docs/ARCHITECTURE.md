# SQLPlay — Architecture

A deep technical tour of how SQLPlay is built. Read this alongside
[INTERVIEW.md](INTERVIEW.md) (Q&A) and [DEPLOY.md](DEPLOY.md) (shipping).

---

## 1. What it is, in one paragraph

SQLPlay is a zero-backend SQL workbench: a real **SQLite database compiled to
WebAssembly** (via [sql.js](https://github.com/sql-js/sql.js)) that runs in the
browser, wrapped in a console UI (playground + graded challenges + schema
tools). The *same* core is packaged four ways from one codebase: a **CLI**, a
**headless library**, an **embeddable React component**, and an **H2-style
backend middleware**. The unifying design idea is a small **engine abstraction**
with an injectable WASM loader, so the identical UI/logic runs whether SQLite
lives in the browser tab or in a Node process.

---

## 2. High-level component map

```
                          ┌─────────────────────────────────────────┐
                          │                CORE                      │
                          │  src/engine/db.ts                        │
                          │   • InMemoryDatabase (sql.js wrapper)     │
                          │   • configureEngine()  ← injectable WASM  │
                          │   • splitStatements(), lastResultSet()    │
                          └───────────────┬─────────────────────────┘
                                          │ used by
      ┌───────────────────────────────────┼───────────────────────────────────┐
      │                     │              │              │                     │
┌─────┴──────┐     ┌────────┴───────┐  ┌───┴─────────┐  ┌─┴───────────────┐
│  Web app   │     │  CLI           │  │ Library:    │  │ Library:        │
│ (Vite)     │     │  bin/cli.mjs   │  │ sqlplay     │  │ sqlplay/react   │
│ React UI   │     │  static server │  │ createDatabase  │ <SqlConsole/>   │
│ dist/      │     │  serves dist/  │  │ (headless)  │  │ (embeds the app)│
└────────────┘     └────────────────┘  └─────────────┘  └─────────────────┘
                                                        ┌──────────────────┐
                                                        │ Library:         │
                                                        │ sqlplay/server   │
                                                        │ Express mw + API │
                                                        │ DB in Node proc  │
                                                        └──────────────────┘
```

Two build systems produce two artifact sets:

- **Vite** builds the web app → `dist/` (what the CLI serves).
- **tsup** builds the library entries → `dist-lib/` (`index`, `react`, `server`).

---

## 3. The engine layer (the heart)

**File:** [`src/engine/db.ts`](../src/engine/db.ts)

`InMemoryDatabase` is a thin, UI-friendly wrapper over one sql.js `Database`:

| Method | Purpose |
|---|---|
| `static create()` | fresh empty DB |
| `static open(bytes)` | restore from exported bytes (used by saved datasets + file-backed server) |
| `run(script)` | execute a multi-statement script; returns per-statement outcomes (result set, rows-affected, timing, error) |
| `query(sql)` | single read query → `{ columns, rows }` |
| `mutate(sql, params)` | parameterized write (used by the editable grid) |
| `schema()` | tables/views with columns, PK/NN flags, row counts (via `PRAGMA table_info`) |
| `foreignKeys()` | FK edges via `PRAGMA foreign_key_list` (for the ER diagram) |
| `export()` | serialize to real `.sqlite` bytes |

### 3.1 The injectable WASM loader — the key design decision

sql.js needs its `.wasm` binary, and **how you load it differs by environment**:

- In the **Vite app**, Vite serves the file — you get a URL via
  `import wasmUrl from "sql.js/dist/sql-wasm.wasm?url"` (a Vite-only feature).
- In the **published library**, there's no Vite — the binary must be embedded so
  it works in Node and any bundler.

Rather than hardcode one, the engine exposes:

```ts
export function configureEngine(config: SqlJsConfig): void { engineConfig = config; }
export async function initEngine() {
  if (!SQL) SQL = await initSqlJs(engineConfig);  // config decides how WASM loads
  return SQL;
}
```

Each entry point supplies its own strategy:

- **App** ([`src/engine/wasm-app.ts`](../src/engine/wasm-app.ts)):
  `configureEngine({ locateFile: () => wasmUrl })`
- **Library** ([`src/public/index.ts`](../src/public/index.ts)):
  `configureEngine({ wasmBinary })` where `wasmBinary` is the `.wasm` **embedded
  into the bundle** by esbuild's `binary` loader.
- **Server** ([`src/server/index.ts`](../src/server/index.ts)): uses sql.js's
  default loader, which finds the `.wasm` on disk in Node.

This one seam is why the same engine and UI power all four delivery modes.

### 3.2 Statement splitting

`splitStatements()` is a hand-written scanner that splits a script on top-level
semicolons while respecting single/double quotes and `--` / `/* */` comments.
It's used both to run scripts statement-by-statement and (crucially) by the
server's read-only guard to inspect **every** statement, not just the first.

---

## 4. The web app

**Stack:** React 18 + TypeScript + Vite. Editor is CodeMirror 6
(`@uiw/react-codemirror` + `@codemirror/lang-sql`) with schema-aware
autocomplete fed from the live `schema()`.

**Component tree** (`src/App.tsx` orchestrates):

- `SqlEditor` — CodeMirror; reports selection so "run selection" works.
- `ResultsTable` — per-statement result blocks; CSV export per result.
- `SchemaTree` — clickable tables/columns.
- `Challenge` (`ChallengeList` + `ChallengeBar`) — challenge mode.
- `ERDiagram` — SVG schema diagram.
- `DataEditor` — editable grid.
- `HelpModal` — in-app docs with a two-mode toggle.

### 4.1 Client persistence (localStorage)

| Key | Contents |
|---|---|
| `sqlplay.history.v1` | recent executed queries |
| `sqlplay.solved.v1` | solved challenge IDs |
| `sqlplay.userDatasets.v1` | saved datasets: `{ id, name, createdAt, b64 }` |

**Saved datasets** serialize the whole DB with `export()` → base64 → localStorage
([`src/lib/userDatasets.ts`](../src/lib/userDatasets.ts)). Loading calls
`InMemoryDatabase.open(base64ToBytes(...))`. This is why a saved dataset restores
tables, relationships, and rows exactly — it's a real SQLite file round-tripped
through the browser.

### 4.2 Working-DB lifecycle

The working database is **in-memory**: a page refresh, dataset switch, or
challenge change creates a fresh DB (mirrors an H2 in-memory database). Only
*saved datasets*, *history*, and *solved progress* persist. This is a deliberate
model, documented in the User Guide's "resetting" section.

---

## 5. Challenge grading

**Files:** [`src/data/challenges.ts`](../src/data/challenges.ts),
[`src/lib/compare.ts`](../src/lib/compare.ts).

Each challenge has a `prompt`, a reference `solution`, a `datasetId`, and an
`orderMatters` flag. On **Check answer**:

1. Build a **fresh** copy of the challenge's dataset, run the user's SQL, take
   the last result set.
2. Build **another** fresh copy, run the reference solution, take its result set.
3. Compare with `compareResults(expected, actual, orderMatters)`.

`compareResults` normalizes cells (numbers rounded to 4 decimals to absorb float
noise; blobs → placeholder), then:

- checks **column count** matches (aliases are ignored — only values matter),
- checks **row count** matches,
- compares rows **in order** if `orderMatters`, else as a **multiset** (both
  sides sorted by stringified row).

Grading both sides on fresh DB copies means a user query that mutates data can't
poison the comparison. All 50 reference solutions are validated by a script that
runs them against their datasets and asserts each returns ≥ 1 row and grades as
a pass against itself.

---

## 6. ER diagram

**Files:** [`src/components/ERDiagram.tsx`](../src/components/ERDiagram.tsx) (in
app), [`scripts/gen-er-svg.mjs`](../scripts/gen-er-svg.mjs) (repo-doc generator).

- Introspect `schema()` + `foreignKeys()`.
- **Layout:** grid of table boxes (`cols = ceil(sqrt(n))`, capped), with each grid
  row's height driven by its tallest box.
- **Edges:** for each FK, draw a line between the two boxes clipped to their
  borders — computed by a **line-to-rectangle intersection** so edges touch box
  edges instead of cutting through them.
- Rendered as inline SVG; "Download SVG" serializes it. The Node generator ports
  the identical layout to emit committed `docs/schema-*.svg` files, so README
  diagrams never drift from the app.

---

## 7. Import / export

**File:** [`src/lib/csv.ts`](../src/lib/csv.ts).

- **CSV parser** handles quoted fields, embedded commas/newlines, and doubled
  quotes (`""`).
- **Type inference** scans column values → `INTEGER` / `REAL` / `TEXT`.
- `csvToSql` / `jsonToSql` generate `CREATE TABLE` + `INSERT`; identifiers are
  sanitized (`[^A-Za-z0-9_]` stripped, leading-digit guarded).
- `resultToCsv` serializes a result set back to CSV (RFC-4180 escaping).

---

## 8. The CLI

**File:** [`bin/cli.mjs`](../bin/cli.mjs). Dependency-free Node static server that
serves `dist/` and opens the browser. Two non-obvious details:

- Sets **`Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy`** headers —
  required for the browser to instantiate the WASM module in some contexts.
- Serves `.wasm` with `Content-Type: application/wasm` — browsers refuse to
  compile it otherwise.

Flags: `--port`, `--host`, `--no-open`.

---

## 9. Backend server mode (H2-style)

**Files:** [`src/server/index.ts`](../src/server/index.ts) (middleware) +
[`src/server/page.ts`](../src/server/page.ts) (self-contained admin page).

- Express/Connect-compatible middleware `(req, res, next)`; also works as a raw
  `http` handler (`next` optional).
- Holds **one server-side sql.js database** (in the Node process).
- Serves a dependency-free admin page (vanilla HTML/JS) that talks to:
  - `GET  {mount}/api/schema` → `{ tables, foreignKeys }`
  - `POST {mount}/api/query`  → runs SQL, returns serialized outcomes.
- The page uses **relative** API URLs, so it works under any mount path.

### 9.1 Options

`database` (`:memory:` or a `.sqlite` file), `init` (inline SQL / `.sql` file /
folder of `*.sql` run in sorted order), `resetOnStart`, `readOnly`, `maxRows`,
`title`.

### 9.2 Init/persistence lifecycle

On first request the DB is built lazily:

- If `database` is a file that **exists** and `!resetOnStart` → load it as-is.
- Otherwise → create fresh, run `init` (schema/seed), and (for file DBs) write it
  to disk. Writes persist the file on mutating statements.

Init errors throw with the offending statement, so a broken schema file fails
loudly at startup.

### 9.3 Read-only guard (a real security edge case)

Naive guard: "does the script start with SELECT?" — **broken**, because
`SELECT 1; DROP TABLE t;` starts with SELECT, and `WITH x AS (…) DELETE …`
starts with WITH. The hardened guard:

- **splits into statements** and checks each one, and
- allows a statement only if it starts with `SELECT`/`PRAGMA`/`EXPLAIN`, **or** is
  a `WITH` whose body contains **no** data-modifying keyword
  (`insert|update|delete|drop|create|alter|…`).

It is documented as a pragmatic guard, not a hardened parser — the console should
still be mounted behind auth in production.

---

## 10. Build & packaging

### 10.1 Two builders

- **Vite** → `dist/` (app). `base: "./"` so assets are relative and servable from
  any path.
- **tsup** ([`tsup.config.ts`](../tsup.config.ts)) → `dist-lib/` for three entries
  (`index`, `react`, `server`), each ESM + CJS + `.d.ts`.

### 10.2 Embedding the WASM in the library

`esbuildOptions` sets `loader['.wasm'] = 'binary'`, so
`import wasmBinary from "sql.js/dist/sql-wasm.wasm"` becomes an inlined
`Uint8Array`. `noExternal: ["sql.js/dist/sql-wasm.wasm"]` forces that asset to be
bundled, while **`sql.js` itself stays external** (resolved from the consumer's
`node_modules`, installed transitively). Net effect: `npm install sqlplay` gives
you a working DB with **zero WASM configuration** in Node or any bundler.

### 10.3 exports map

```jsonc
"exports": {
  ".":       { types, import: index.js,  require: index.cjs },
  "./react": { types, import: react.js,  require: react.cjs },
  "./server":{ types, import: server.js, require: server.cjs }
}
```

`react`/`react-dom` are **peer dependencies** (optional) so the component uses
the host app's React. The React entry uses tsup `injectStyle: true` to inject its
CSS at runtime — consumers import nothing extra.

---

## 11. Testing

- **E2E (Playwright)** — [`e2e.mjs`](../e2e.mjs): drives the real app in headless
  Chromium — runs a query, checks results, ER diagram, data editor, create+save
  dataset, **persistence across reload**, challenge pass/fail, help modal. 11
  assertions.
- **Server (HTTP)** — spins up the middleware and asserts page serving, query
  API, schema API, file persistence across restart, `readOnly` (including the
  bypass fixes), and `init` from a folder / inline / `resetOnStart`.
- **Data/logic** — a transpile-and-run harness validates all 50 challenge
  solutions and the CSV/compare libraries against sql.js.

---

## 12. Key trade-offs (short form; full Q&A in INTERVIEW.md)

| Decision | Why | Cost |
|---|---|---|
| SQLite (sql.js) not Postgres | zero-setup, ubiquitous, WASM-ready | dialect ≠ other DBs |
| In-memory working DB | true zero-backend, offline, private | resets on refresh (mitigated by save/export) |
| Embed WASM in the library | works in any bundler with no config | +~860 KB bundle |
| One engine, injectable loader | one codebase → 4 delivery modes | a small indirection |
| FK enforcement OFF by default | forgiving for learners | FKs declared but not enforced |
| `rowid`-based grid edits | works even without a declared PK | not for `WITHOUT ROWID` tables |
| Read-only guard by keyword, not full parser | simple, good enough for a dev tool | not a hard security boundary |
