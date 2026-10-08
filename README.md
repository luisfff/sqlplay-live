# SQLPlay

[![npm version](https://img.shields.io/npm/v/sqlplay.svg)](https://www.npmjs.com/package/sqlplay)
[![license](https://img.shields.io/npm/l/sqlplay.svg)](https://github.com/Yogesh0627/sqlplay/blob/main/LICENSE)
[![node](https://img.shields.io/node/v/sqlplay.svg)](https://nodejs.org)

An **H2-Console-style SQL playground for JavaScript.** Practice SQL against a real in-memory **SQLite** database that runs **100% in your browser** — no server, no database install, no setup.

**🚀 Live demo: [sqlplay.vercel.app](https://sqlplay.vercel.app/)**  ·  **📦 [npm](https://www.npmjs.com/package/sqlplay)**  ·  **💻 [GitHub](https://github.com/Yogesh0627/sqlplay)**

Java has the H2 Console for this. JavaScript didn't have a comparable zero-setup SQL practice console — SQLPlay fills that gap by putting a friendly UI on top of [sql.js](https://github.com/sql-js/sql.js) (SQLite compiled to WebAssembly).

![SQLPlay console](https://raw.githubusercontent.com/Yogesh0627/sqlplay/main/docs/screenshot-playground.png)

---

## Quick start

Run it instantly — no global install needed:

```bash
npx sqlplay        # npm
pnpm dlx sqlplay   # pnpm
bunx sqlplay       # bun
```

Your browser opens to a full SQL console with the **Tasks database** ready to query.
Shared links still open their specified dataset and query.

In Playground, **Reset current dataset** restores the selected sample's seed or
the selected saved dataset's snapshot, discarding unsaved database changes.
**Reset to Tasks database** always creates a fresh Tasks database and restores its
starter query, regardless of the current dataset or schema. Both ask for confirmation;
cancel changes nothing. Saved datasets, query history and challenge progress are kept.

Or just open the **[live demo](https://sqlplay.vercel.app/)**.

### CLI options

```bash
sqlplay --port 4577    # choose the port
sqlplay --no-open      # don't open the browser automatically
sqlplay --help
```

---

## Features

### Playground

- **Real SQLite** engine (via WebAssembly) — full SQL: JOINs, subqueries, window functions, recursive CTEs, triggers, JSON functions, UPSERT.
- **Create your own datasets** — write full DDL (`CREATE TABLE … FOREIGN KEY`), insert data, build relationships, then **Save** it as a named dataset that persists in your browser.
- **Live schema browser** — tables, columns, PK/NN flags, row counts. Click to insert into the editor.
- **SQL editor** with syntax highlighting and **schema-aware autocomplete**.
- **Run selection** — highlight part of a script and only that runs.
- **Query history** — every executed query is saved locally; click to reload.
- **ER diagram** — an auto-laid-out entity-relationship diagram of the live schema, with foreign-key edges. Export it as SVG.
- **Editable data grid** — edit cells, add rows, delete rows inline.
- **Import CSV / JSON** — drop a file in and it auto-creates a typed table.
- **Export** result sets to CSV, or the whole database to a `.sqlite` file.
- **Shareable links** — the dataset and query are encoded in the URL hash, so nothing is sent to a server.
- **Sample datasets** — Tasks (default), HR/Employees, E-commerce/Orders, University/Enrollments, or start empty.

### Challenge mode

Practice SQL like LeetCode, offline.

- **50 graded problems** (Easy → Hard) across three datasets.
- Write a query, hit **Check answer**, and your result set is compared against the reference solution (order-sensitive where it matters, numeric tolerance for floats).
- Hints, **Show solution**, and solved-progress tracked locally.

### Everywhere

- **Keyboard-first** — `Ctrl`/`Cmd` + `Enter` runs (or checks) the current query.
- **Responsive** — works on desktop, tablet, and mobile.
- **Fully offline.** Nothing leaves your machine.

---

## Use it as a library

```bash
npm install sqlplay
```

The SQLite WASM binary is **embedded**, so these work in Node and any bundler (Vite, webpack, Next.js) with **zero configuration**.

### Headless in-memory database

Works in Node or the browser.

```js
import { createDatabase } from "sqlplay";

const db = await createDatabase();
db.run("CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT);");
db.run("INSERT INTO t (v) VALUES ('hello');");

const result = db.query("SELECT * FROM t;"); // { columns, rows }
const tables = db.schema();                  // table/column/FK metadata
const bytes = db.export();                   // a real .sqlite file (Uint8Array)
```

### Embeddable React console

Drop the full UI into your app. `react` and `react-dom` are peer dependencies; the CSS is injected automatically.

```jsx
import { SqlConsole } from "sqlplay/react";

export default function AdminPage() {
  return <SqlConsole height="600px" />;
}
```

### Backend-served console (H2-style)

Mount it as Express/Connect middleware. The database lives in **your Node process**, and the browser console talks to it over an API — exactly the H2 Console model.

```js
import express from "express";
import { sqlplay } from "sqlplay/server";

const app = express();

app.use("/db-console", sqlplay({
  database: ":memory:", // or "./dev.sqlite" (persists)
  init: "./db",         // build schema + seed from ./db/*.sql on startup
}));

app.listen(3000); // open http://localhost:3000/db-console
```

![Backend server console](https://raw.githubusercontent.com/Yogesh0627/sqlplay/main/docs/screenshot-server.png)

Keep your schema and seed SQL in a folder, and SQLPlay builds the database from it on startup — edit, restart, query:

```text
db/
  001_schema.sql
  002_seed.sql
```

**Options**

| Option | Default | Description |
| --- | --- | --- |
| `database` | `":memory:"` | `":memory:"`, or a path to a `.sqlite` file (persists on writes) |
| `init` | — | Inline SQL, a `.sql` file, or a folder of `*.sql` run in sorted order |
| `resetOnStart` | `false` | For a file database, rebuild from `init` on every start |
| `readOnly` | `false` | Reject anything that isn't `SELECT`/`PRAGMA`/`EXPLAIN`/`WITH` |
| `maxRows` | `1000` | Cap rows returned per result set |
| `title` | `"SQLPlay — Server Console"` | Header text |

> **Security:** this console executes arbitrary SQL. Mount it on a dev-only or authenticated route, and use `readOnly: true` for anything beyond local development.

---

## SQL dialect

SQLPlay runs the **SQLite** dialect (SQLite 3.49 via [sql.js](https://github.com/sql-js/sql.js)). Standard ANSI SQL — everything you'd practice for interviews and real work — runs as-is.

Engine-specific syntax from other databases (H2's `MERGE` / `SELECT TOP`, T-SQL, PL/pgSQL) is not supported. Use the SQLite equivalent, e.g. `LIMIT` instead of `SELECT TOP`.

---

## Documentation

- **[User Guide](https://github.com/Yogesh0627/sqlplay/blob/main/docs/USER_GUIDE.md)** — every feature, data lifecycle, dialect, troubleshooting
- **[Architecture](https://github.com/Yogesh0627/sqlplay/blob/main/docs/ARCHITECTURE.md)** — engine, delivery modes, build system, trade-offs
- **[Deployment](https://github.com/Yogesh0627/sqlplay/blob/main/docs/DEPLOY.md)** — npm publish, static hosting, backend, security, CI
- **[Interview prep](https://github.com/Yogesh0627/sqlplay/blob/main/docs/INTERVIEW.md)** — pitch, deep-dive Q&A, edge cases

---

## How it works

The console is a static web app (React + Vite). All SQL executes client-side in sql.js, so the database lives entirely in browser memory — refresh to reset, exactly like an H2 in-memory database. The `sqlplay` CLI is a tiny dependency-free static server that serves the built app and opens your browser.

The same core is packaged four ways from one codebase — CLI, headless library, React component, and Express middleware — by making the WASM loader injectable. See [ARCHITECTURE.md](https://github.com/Yogesh0627/sqlplay/blob/main/docs/ARCHITECTURE.md).

---

## Development

```bash
npm install
npm run dev        # Vite dev server with hot reload
npm run build      # produce dist/ (the web app)
npm run build:lib  # produce dist-lib/ (the npm library)
npm run build:all  # both
npm start          # run the CLI against the built dist/
npm run test:e2e   # Playwright end-to-end tests
npm run docs:er    # regenerate the ER-diagram SVGs in docs/
```

---

## Roadmap

- **Pluggable adapters** so the backend console can point at a real production database (Postgres via PGlite/pg, SQLite via Turso) by swapping the connection.

---

## Author

**Yogesh Chauhan**

- GitHub: [@Yogesh0627](https://github.com/Yogesh0627)
- LinkedIn: [yogeshchauhan-dev](https://www.linkedin.com/in/yogeshchauhan-dev/)

## License

[MIT](https://github.com/Yogesh0627/sqlplay/blob/main/LICENSE)
