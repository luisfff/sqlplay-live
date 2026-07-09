# SQLPlay — User Guide

A complete guide to installing, running, and using SQLPlay: the H2-Console-style,
zero-backend SQL playground and practice environment for JavaScript.

> **Status legend**
> ✅ **Available now** — works in the current release.
> 🚧 **Planned** — on the roadmap, not yet shipped. Clearly marked wherever it appears.

---

## Table of contents

1. [What SQLPlay is](#1-what-sqlplay-is)
2. [Installation & running](#2-installation--running) ✅
3. [The interface at a glance](#3-the-interface-at-a-glance)
4. [Playground: querying](#4-playground-querying) ✅
5. [Exploring the schema](#5-exploring-the-schema) ✅
6. [Editing data](#6-editing-data) ✅
7. [Importing & exporting](#7-importing--exporting) ✅
8. [Creating & saving your own datasets](#8-creating--saving-your-own-datasets) ✅
9. [Sharing](#9-sharing) ✅
10. [Challenge mode](#10-challenge-mode) ✅
11. [Resetting & the data lifecycle](#11-resetting--the-data-lifecycle) ✅
12. [SQL dialect notes](#12-sql-dialect-notes)
13. [Keyboard shortcuts](#13-keyboard-shortcuts)
14. [Troubleshooting / FAQ](#14-troubleshooting--faq)
15. [Using SQLPlay as a dependency](#15-using-sqlplay-as-a-dependency) ✅
16. [Uninstalling](#16-uninstalling)

---

## 1. What SQLPlay is

SQLPlay runs a **real SQLite database (compiled to WebAssembly)** entirely in your
browser. There is no server and no database to install. You get:

- a **Playground** to write and run any SQL, and
- a **Challenge mode** to practice SQL against graded problems.

Because everything runs client-side, it is fully offline and nothing you type
ever leaves your machine.

---

## 2. Installation & running ✅

You do **not** need to install anything globally. Pick whichever matches your
package manager.

### Option A — Run instantly (recommended)

```bash
npx sqlplay          # npm
pnpm dlx sqlplay     # pnpm
bunx sqlplay         # bun
```

This downloads and launches SQLPlay, then opens your browser to the console.

### Option B — Install globally

```bash
npm install -g sqlplay
sqlplay
```

### Option C — Run from source

```bash
git clone <your-repo-url> sqlplay
cd sqlplay
npm install
npm run dev      # hot-reloading dev server (for development)
# or:
npm run build    # produce the production build in dist/
npm start        # serve the built app via the CLI
```

### CLI options

```
sqlplay [options]

  -p, --port <n>   Port to listen on          (default: 4577)
      --host <h>   Host/interface to bind      (default: 127.0.0.1)
      --no-open    Do not open the browser automatically
  -h, --help       Show help
```

Examples:

```bash
sqlplay --port 8080          # run on http://127.0.0.1:8080
sqlplay --no-open            # start the server but don't launch a browser
```

Press **Ctrl+C** in the terminal to stop the server.

---

## 3. The interface at a glance

```
┌───────────────────────────────────────────────────────────────┐
│  ▊ SQLPlay   [ Playground | Challenges ]   Dataset ▾  ▶ Run  …  │  ← top bar
├──────────────┬────────────────────────────────────────────────┤
│              │  SQL editor (type queries here)                 │
│   Sidebar    │                                                 │
│  (Schema or  ├────────────────────────────────────────────────┤
│  Challenges) │  [ Results | ER Diagram | Data editor ]         │  ← output tabs
│              │  output for the selected tab                    │
├──────────────┴────────────────────────────────────────────────┤
│  status bar: last action / errors                              │
└───────────────────────────────────────────────────────────────┘
```

- **Mode switch** (top): toggle between **Playground** and **Challenges**.
- **Dataset picker** (Playground only): choose a sample or one of your saved
  datasets.
- **Toolbar buttons**: Run, Save dataset, History, Import, Share, Export.
- **Sidebar**: the live **schema** (Playground) or the **challenge list**.
- **Output tabs** (Playground): Results, ER Diagram, Data editor.
- **Status bar**: shows what just happened, including SQL errors.

---

## 4. Playground: querying ✅

1. Choose a dataset from the **Dataset** dropdown (start with *HR / Employees*).
2. Type SQL in the editor.
3. Run it with **▶ Run** or **Ctrl/⌘ + Enter**.

**Run only part of a script:** select (highlight) one or more statements in the
editor and run — only the selection executes. With nothing selected, the whole
editor runs. Statements are split on top-level semicolons, so you can run a
multi-statement batch (e.g. `CREATE …; INSERT …; SELECT …;`) at once.

**Reading results:** each statement gets its own result block showing the SQL,
row count, and execution time. `SELECT`s show a table; `INSERT/UPDATE/DELETE`
show rows-affected; errors show in red.

---

## 5. Exploring the schema ✅

- **Schema sidebar** (Playground): lists every table/view with column types,
  🔑 primary-key and NN (not-null) flags, and row counts. Click a table name to
  insert `SELECT * FROM <table> LIMIT 100;`; click a column to insert its name.
- **ER Diagram tab**: an auto-generated entity-relationship diagram of the
  current schema, with foreign-key arrows. Click **⭳ Download SVG** to export it
  (great for documentation).
- **Autocomplete**: the editor suggests table and column names from the live
  schema as you type — it updates automatically when you create new tables.

---

## 6. Editing data ✅

Open the **Data editor** tab (Playground):

1. Pick a table from the dropdown.
2. **Edit a cell**: click it, change the value, press **Enter** or click away.
   The change is written with `UPDATE … WHERE rowid = …`.
3. **Add a row**: click **＋ Add row**, fill the inline draft, click **Save**.
   Empty fields are stored as `NULL`.
4. **Delete a row**: click the **✕** at the end of the row.

Edits apply to the live in-memory database immediately and update row counts.
(See [Resetting & the data lifecycle](#11-resetting--the-data-lifecycle) for
what persists.)

---

## 7. Importing & exporting ✅

**Import** (toolbar → **⭱ Import**):

- Select a **`.csv`** or **`.json`** file.
- SQLPlay infers column types and auto-creates a table named after the file,
  then loads the rows. JSON must be an array of objects.

**Export:**

- **Result → CSV**: each result block has a **⭳ CSV** link to download that
  result set.
- **Whole database → `.sqlite`**: toolbar → **⭳ .sqlite** downloads a real
  SQLite file you can open in any SQLite tool.

---

## 8. Creating & saving your own datasets ✅

You can build a complete schema from scratch and keep it.

**Walkthrough:**

1. Set the dataset to **Empty database**.
2. Write your schema and data in the editor, e.g.:

   ```sql
   CREATE TABLE author (
     id   INTEGER PRIMARY KEY,
     name TEXT NOT NULL
   );

   CREATE TABLE book (
     id        INTEGER PRIMARY KEY,
     title     TEXT NOT NULL,
     author_id INTEGER REFERENCES author(id)   -- a relationship
   );

   INSERT INTO author (name) VALUES ('Ursula K. Le Guin'), ('Ted Chiang');
   INSERT INTO book (title, author_id) VALUES
     ('A Wizard of Earthsea', 1),
     ('Exhalation', 2);
   ```

3. **Run** it. The tables, relationship, and data now exist; check the
   **ER Diagram** tab to see the `book → author` link.
4. Click **💾 Save dataset** and give it a name (e.g. *Library*).
5. Your dataset now appears under **"My datasets"** in the dropdown and
   **persists across browser sessions**.

**Managing saved datasets:**

- **Load**: pick it from the dropdown.
- **Update**: with it loaded, make changes, **💾 Save dataset**, and keep the
  same name to overwrite.
- **Delete**: with it loaded, click **🗑 Delete**.

**Where it is stored:** saved datasets are serialized and kept in your browser's
`localStorage` (key `sqlplay.userDatasets.v1`). This is per-browser and
per-machine — it is not synced or uploaded. Very large databases may exceed the
browser storage quota; if a save fails for that reason, the status bar will say
so.

---

## 9. Sharing ✅

Toolbar → **🔗 Share** copies a link to your clipboard. The link encodes the
**selected dataset and the current query text** in the URL fragment (`#…`), so it
is reconstructed entirely in the recipient's browser — nothing is sent to a
server.

> **Important:** a shared link carries the **query text**, not your table data.
> If you want a link to reproduce a custom schema, make sure the editor contains
> the full `CREATE TABLE … / INSERT …` script — then running it recreates
> everything. Data created only via **Import** or the **Data editor** is *not*
> embedded in the link. (Embedding the full database in a link is 🚧 planned.)

---

## 10. Challenge mode ✅

Switch to **Challenges** in the top bar.

- The sidebar lists 50 problems grouped by dataset, each tagged Easy / Medium /
  Hard (colored dot) with a ✓ once solved. A progress bar shows how many you've
  solved.
- Click a challenge to load its dataset and read the prompt.
- Write your query, then click **✓ Check answer** (or **Ctrl/⌘ + Enter**).
  Your result set is compared to the reference solution — order-sensitive only
  when the prompt requires ordering, with numeric tolerance for decimals.
- Use **Hint** for a nudge, or **Show solution** to drop the reference query
  into the editor.
- Solved challenges are remembered across sessions.

---

## 11. Resetting & the data lifecycle ✅

This is the part people most often ask about. There are two kinds of state:

### A) The working database — **in-memory, temporary**

The database you query in the Playground lives only in the current browser tab's
memory. It is **reset (wiped)** when you:

- **refresh / reload** the page, or
- **switch to another dataset** in the dropdown, or
- (in Challenge mode) **select a different challenge**.

Any tables you created, rows you inserted, or edits you made are lost on reset —
**unless you saved them** (see below). This mirrors an H2 in-memory database.

**To keep your work:** click **💾 Save dataset** (Section 8), or **⭳ .sqlite**
to download a file.

**To deliberately reset the working DB:** just re-select the current dataset in
the dropdown, or refresh the page.

### B) Persistent state — **kept in the browser across sessions**

| What | Where (localStorage key) | How to reset |
|---|---|---|
| Saved datasets | `sqlplay.userDatasets.v1` | Load one → **🗑 Delete** |
| Query history | `sqlplay.history.v1` | **🕑 History** panel → **Clear** |
| Solved-challenge progress | `sqlplay.solved.v1` | Clear the key (see below) |

**Full reset (clear everything SQLPlay stored):** open your browser's DevTools
console on the SQLPlay tab and run:

```js
Object.keys(localStorage)
  .filter(k => k.startsWith("sqlplay."))
  .forEach(k => localStorage.removeItem(k));
location.reload();
```

This removes all saved datasets, history, and solved progress, and reloads a
clean SQLPlay. (Sharing uses the URL, not storage, so there is nothing to clear
for that.)

---

## 12. SQL dialect notes

SQLPlay runs **SQLite 3.49** (via [sql.js](https://github.com/sql-js/sql.js)).

**Supported:** standard ANSI SQL — `JOIN`s (including `RIGHT`/`FULL OUTER`),
subqueries, `GROUP BY`/`HAVING`, recursive CTEs, window functions, `UPSERT`
(`ON CONFLICT`), triggers, JSON functions, `ALTER TABLE DROP COLUMN`.

**Not supported (engine-specific syntax from other databases):** e.g. H2/SQL
Server `SELECT TOP n` (use `LIMIT n`), `MERGE`, `CREATE SEQUENCE`, stored
procedures (`CALL`), `REGEXP_LIKE`. Use the SQLite equivalents.

---

## 13. Keyboard shortcuts

| Shortcut | Action |
|---|---|
| **Ctrl / ⌘ + Enter** | Run the query (or **Check answer** in Challenge mode) |
| **Enter** (in a Data-editor cell) | Commit the cell edit |
| Standard editor keys | Multiple cursors, bracket matching, autocomplete (`Ctrl+Space`) |

---

## 14. Troubleshooting / FAQ

**The browser didn't open.**
Open the URL printed in the terminal manually (default `http://127.0.0.1:4577/`),
or re-run without `--no-open`.

**"Port already in use."**
Another process holds the port. Run on a different one: `sqlplay --port 8080`.

**"Built assets not found" when running from source.**
Run `npm run build` first; the CLI serves the `dist/` folder.

**My data disappeared after refreshing.**
That's expected — the working DB is in-memory. **Save dataset** or export to
`.sqlite` to keep it. See [Section 11](#11-resetting--the-data-lifecycle).

**"Save failed: storage is full."**
The database is too large for browser `localStorage`. Export to `.sqlite`
instead, or reduce the data.

**A query that works in Postgres/MySQL/H2 fails here.**
Dialect difference — SQLPlay is SQLite. See [Section 12](#12-sql-dialect-notes).

**Blank page / WASM error.**
The console needs to load a WebAssembly module; make sure you reached it through
the SQLPlay server (the CLI sets the required cross-origin headers). Loading the
files directly from disk (`file://`) will not work.

---

## 15. Using SQLPlay as a dependency

Install it into your own project:

```bash
npm install sqlplay
```

The SQLite WASM binary is **embedded** in the package, so the APIs below work in
Node and any bundler (Vite, webpack, Next.js) with **no extra configuration**.

### 15.1 Headless in-memory database ✅

```js
import { createDatabase } from "sqlplay";

const db = await createDatabase();          // in-memory SQLite
db.run("CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT);");
db.run("INSERT INTO t (v) VALUES ('hello');");

const result = db.query("SELECT * FROM t;");  // { columns: [...], rows: [[...]] }
const tables = db.schema();                   // table/column/FK metadata
const bytes  = db.export();                    // a real .sqlite file (Uint8Array)
```

Works in **Node or the browser** — useful for prototyping a data layer, tests,
scripting, or querying data privately.

### 15.2 Embeddable React console ✅

```jsx
import { SqlConsole } from "sqlplay/react";

export default function AdminPage() {
  return <SqlConsole height="600px" />;   // full console UI inside your app
}
```

`react` and `react-dom` are **peer dependencies** (you already have them). The
component's CSS is injected automatically — nothing else to import. The database
runs client-side; no backend required.

### 15.3 Backend-served console, H2-style ✅

Mount it as Express/Connect middleware. The **database lives in your Node
process**; the browser console sends SQL to a small API served by the middleware
— exactly the H2 Console model.

```js
import express from "express";
import { sqlplay } from "sqlplay/server";

const app = express();
app.use("/db-console", sqlplay({ database: ":memory:" }));
app.listen(3000);
// → open http://localhost:3000/db-console
```

**Options:**

| Option | Default | Meaning |
|---|---|---|
| `database` | `":memory:"` | `":memory:"`, or a path to a `.sqlite` file (loaded on start, **persisted on writes**) |
| `init` | — | Schema/seed SQL to build the DB on startup: inline SQL, a `.sql` file path, a **directory** (all `*.sql` run in sorted filename order), or an array of these |
| `resetOnStart` | `false` | For a file database, rebuild from `init` on every start (in-memory is always fresh) |
| `readOnly` | `false` | Reject anything that isn't `SELECT`/`PRAGMA`/`EXPLAIN`/`WITH` (returns HTTP 403) |
| `maxRows` | `1000` | Cap rows returned per result set |
| `title` | `"SQLPlay — Server Console"` | Header text |

**Set up a schema folder (recommended dev workflow):**

```
db/
  001_schema.sql     -- CREATE TABLE users (...); CREATE TABLE posts (...);
  002_seed.sql       -- INSERT INTO users ...;
```

```js
app.use("/db-console", sqlplay({ database: ":memory:", init: "./db" }));
```

On every start, SQLPlay runs your `db/*.sql` in order to build the schema and
seed data, then serves the console over it. Edit the files, restart, and the
database is rebuilt — then query, update, and check in the console. If an init
file has a SQL error, startup fails loudly with the offending statement.

**Reset flow:** the database is owned by the server process. An in-memory
database is rebuilt from `init` on every start; a file-backed database persists
between restarts unless you pass `resetOnStart: true`. A future **adapter**
option will let you point the same console at a real production database (e.g.
Postgres) without changing the UI.

> **Security note:** a console that executes arbitrary SQL is dangerous to
> expose. Mount it on a **dev-only or authenticated** route — never publicly. Use
> `readOnly: true` for anything beyond local development.

---

## 16. Uninstalling

- **Ran via `npx` / `pnpm dlx` / `bunx`:** nothing to uninstall; it wasn't
  permanently installed. Clear the npm cache if you wish.
- **Installed globally:** `npm uninstall -g sqlplay`.
- **Clone from source:** delete the project folder.
- **Browser data:** run the "Full reset" snippet in
  [Section 11](#11-resetting--the-data-lifecycle) to remove saved datasets,
  history, and progress.

---

*This guide documents SQLPlay's current release. Sections marked 🚧 are on the
roadmap and will be documented as “available” once shipped.*
