# SQLPlay — Interview Preparation

Everything you need to speak about this project with confidence: the pitch, an
architecture walkthrough, deep-dive Q&A, the edge cases you handled, trade-offs,
and rapid-fire answers. Pair with [ARCHITECTURE.md](ARCHITECTURE.md).

> **How to use this:** read it end-to-end once, then practice saying Sections 1,
> 2, and 7 out loud. In an interview, most technical follow-ups map to Sections
> 4–6.

---

## 1. The 30-second pitch

> "SQLPlay is a zero-backend SQL workbench. It runs a real SQLite database
> compiled to WebAssembly entirely in the browser, so you can practice, prototype,
> and query data with no server and no setup. On top of the engine I built a
> console — a playground, 50 auto-graded SQL challenges, an auto-generated ER
> diagram, and an editable data grid — and I packaged the same core four ways from
> one codebase: a CLI (`npx sqlplay`), a headless npm library, an embeddable React
> component, and an H2-style backend middleware you mount into an Express app. It's
> published to npm and covered by end-to-end browser tests."

**One-liner:** *"H2 Console, but for the JavaScript ecosystem — installable,
offline, and embeddable."*

---

## 2. Architecture walkthrough (say this if asked "how does it work?")

1. **Engine.** The core is a wrapper around **sql.js** — SQLite compiled to
   WebAssembly. It exposes `run`, `query`, `schema`, `foreignKeys`, `export`, etc.
2. **The key idea** is that WASM loading is *injectable*. sql.js needs its `.wasm`
   binary, and how you load it differs — Vite serves a URL, a published library
   must embed the bytes, Node finds it on disk. So the engine takes a
   `configureEngine()` config, and each delivery mode plugs in its own loader.
   That single seam is why one engine + one UI powers four products.
3. **The web app** (React + Vite) is the console — editor (CodeMirror),
   results grid, schema tree, ER diagram, data editor, challenges.
4. **Four delivery modes:** CLI (static server serving the built app), headless
   `createDatabase()`, `<SqlConsole/>` React component, and `sqlplay/server`
   Express middleware where the DB lives in Node.
5. **Two build systems:** Vite for the app (`dist/`), tsup for the library
   (`dist-lib/`), with the WASM embedded into the library bundle so it works with
   zero config in any environment.

---

## 3. "Why did you build it / what problem does it solve?"

- **Problem:** Java has the H2 Console — a zero-setup, embedded SQL database with
  a web console. JavaScript had the pieces (sql.js, DB Fiddle, LeetCode SQL) but
  no single installable, offline, all-in-one tool.
- **Who uses it:** interactive SQL tutorials, "try it live" docs, SQL interview
  assessment, dev prototyping/scratchpads, private local CSV/JSON querying, and
  as an admin console for local-first apps.
- **What makes it different:** it's *installed and run*, not a website —
  offline, no account; it's *all-in-one* (practice + build + visualize + edit);
  it lets you *own your data* (create/save datasets, import your own files); and
  it's *embeddable* as a library. (Be honest: it doesn't out-content DataLemur on
  problem count — that's not the point.)

---

## 4. Technical deep-dive Q&A

**Q: Why SQLite / sql.js and not Postgres or a hosted DB?**
Zero-setup and offline were the core requirements, and SQLite compiles to a
~660 KB WASM module that runs in a browser tab — you can't do that with Postgres
server. SQLite is also the most widely deployed SQL engine on earth, so it's a
realistic practice target. The trade-off is dialect: SQLite ≠ Postgres/H2, so
some engine-specific syntax (`SELECT TOP`, `MERGE`) doesn't work. I document that
explicitly rather than pretend it's universal.

**Q: What actually is sql.js? Isn't WebAssembly slow?**
sql.js is SQLite's C source compiled to WebAssembly via Emscripten. WASM runs at
near-native speed for CPU-bound work like query execution; for the data sizes
this tool targets (thousands of rows), it's instant. The real cost is the ~660 KB
module download and load time, not query speed.

**Q: How do you load the WASM, and why was that interesting?**
That was the crux of making it a real library. In the Vite app I import the wasm
as a URL (`?url`) — a Vite feature. But a *published* library can't rely on Vite;
it has to work in Node, webpack, Next.js, etc. sql.js accepts a preloaded
`wasmBinary`, so in the library build I use esbuild's `binary` loader to **inline
the `.wasm` into the bundle** and pass it as `wasmBinary`. Result: `npm install
sqlplay` works with zero WASM configuration anywhere. I abstracted this behind
`configureEngine()` so the app, library, and server each inject their own loader.

**Q: How are challenges graded?**
Each challenge has a reference solution and an `orderMatters` flag. On check, I
build a *fresh* copy of the dataset and run the user's SQL, and *another* fresh
copy for the reference solution, then compare result sets. Comparison normalizes
cells (floats rounded to 4 decimals), checks column and row counts, and compares
rows in order if ordering matters, otherwise as a multiset (both sides sorted).
Grading on fresh copies means a user query that mutates data can't skew the
comparison. I also wrote a validation script that runs all 50 solutions and
asserts each returns rows and passes against itself — so the answer key can't rot.

**Q: How does the editable data grid write changes back?**
It uses SQLite's implicit `rowid` as a stable key: it selects `rowid, *`, and on
a cell edit runs `UPDATE … WHERE rowid = ?` with a parameterized value. Using
`rowid` means editing works even on tables without a declared primary key (e.g.
imported CSVs). Type coercion picks number vs string based on the column's
declared affinity.

**Q: How does the ER diagram lay out and draw edges?**
Tables become boxes in a grid (`cols = ceil(sqrt(n))`); each grid row's height is
its tallest box. For FK edges I draw a line between two boxes and clip each end to
the box border with a line-to-rectangle intersection, so edges touch the box edge
instead of slicing through it. It renders as inline SVG and exports via
`XMLSerializer`.

**Q: The backend (`sqlplay/server`) — how does it differ from the browser app?**
In the app, the DB lives in the browser (WASM). In server mode, the DB lives in
the **Node process** and the browser console talks to it over a small JSON API
(`/api/query`, `/api/schema`) — exactly the H2 Console client/server split. It's
Express middleware, with options for `database` (memory or file), `init`
(schema/seed from SQL files or a folder), `resetOnStart`, `readOnly`, and
`maxRows`.

**Q: How does the `init` / schema-folder feature work?**
You point `init` at inline SQL, a `.sql` file, or a **directory** of `*.sql` run
in sorted filename order (`001_schema.sql`, `002_seed.sql`, …). On startup, when
the DB is fresh, it runs them to build schema + seed; a broken file throws at
startup with the offending statement. It mirrors a migrations folder — dev
workflow is "edit SQL files, restart, query."

**Q: How do you serve WASM correctly?**
Two gotchas: the `.wasm` must be served with `Content-Type: application/wasm`
(browsers refuse to compile it otherwise), and the CLI sets
`Cross-Origin-Opener-Policy`/`Embedder-Policy` headers. Loading from `file://`
won't work — it has to come through a server.

**Q: ESM or CommonJS? How is the package structured?**
Dual — tsup emits both ESM (`.js`) and CJS (`.cjs`) plus `.d.ts` for each entry,
wired through the `exports` map (`.`, `./react`, `./server`). `react`/`react-dom`
are optional **peer dependencies** so the component uses the host's React;
`sql.js` is external (resolved from the consumer's node_modules); only the WASM
binary is bundled.

---

## 5. Edge cases I handled (great to volunteer — shows rigor)

**Read-only guard bypass (a real security bug I found and fixed).**
The naive check "does the query start with SELECT?" is exploitable:
`SELECT 1; DROP TABLE users;` passes it, and `WITH x AS (…) DELETE …` starts with
a read keyword too. I fixed it by splitting the script into statements and
checking **each** one, and allowing `WITH` only when its body has no
data-modifying keyword. I verified with attack cases (multi-statement DROP,
`WITH…DELETE`, bare `UPDATE`) returning 403 while `WITH…SELECT` and `SELECT`
return 200. I'm also honest that it's a pragmatic guard, not a full parser — so
the console should still be behind auth.

**Statement splitting.** Splitting on `;` naively breaks on semicolons inside
string literals or comments. I wrote a scanner that tracks quote and comment
state so `INSERT … VALUES (';')` isn't mis-split.

**Floating-point grading.** `ROUND(AVG(x),2)` can differ by float noise, so the
comparator rounds numeric cells to 4 decimals before comparing.

**Order sensitivity.** Some challenges require `ORDER BY`; most don't. Each
challenge declares `orderMatters`; the comparator sorts both sides as a multiset
when order is irrelevant, so a correct-but-differently-ordered answer still passes
(and a wrong order fails only when it should).

**Empty result sets.** sql.js returns `[]` for a SELECT with no rows, which would
break grading (no columns to compare). I ensured every challenge's correct answer
returns ≥ 1 row, validated by a script — so "expected 0 rows" challenges don't
exist.

**CSV parsing.** Quoted fields with embedded commas/newlines and doubled quotes
(`""`) are handled by a stateful parser, not a naive `split(',')`.

**Blob serialization.** Result cells can be `Uint8Array` (blobs) which aren't
JSON-serializable; I map them to a placeholder before sending over the server API.

**localStorage quota.** Saving a large dataset can exceed the browser quota; the
save is wrapped and surfaces a friendly "storage is full — export to .sqlite"
message instead of throwing.

**FK enforcement.** SQLite has foreign keys **off** by default. I intentionally
left it off (learners insert rows in any order without cryptic failures) while
still *declaring* and *visualizing* relationships in the ER diagram — a
learning-tool trade-off I can justify.

**Build quirk.** esbuild's output layout differs between single- and multi-entry
builds (`outbase`); I hit and resolved this while wiring the doc-generator and
library builds — a reminder that bundler defaults are load-bearing.

---

## 6. Trade-offs & "what would you do differently?"

**Trade-offs I made (and defend):**
- **In-memory working DB** → true zero-backend and privacy, at the cost of
  resetting on refresh. Mitigated with Save-as-dataset and `.sqlite` export.
- **Embed WASM in the library** → zero-config for consumers, at ~860 KB per
  bundle. Right call for a dev tool; I'd offer an opt-out slim build if size
  mattered.
- **Keyword-based read-only guard** → simple and good enough for a dev tool; a
  hardened version would use a real SQL parser.
- **Single database per backend** → matches how real backends work (H2/Postgres);
  I deliberately did *not* build multi-database switching to avoid scope creep.

**What I'd do next:**
- **Pluggable adapters** so the backend console can point at real Postgres
  (via PGlite/pg) or Turso — the "swap the connection" vision. Same dialect
  dev↔prod is the key to making that honest.
- **Code-splitting** the app so the 660 KB WASM loads lazily (faster first paint).
- **More challenges** and a hint/solution telemetry model.
- **A real SQL parser** for the read-only guard and for editable-result detection.

**What I learned:**
- How WebAssembly modules are loaded across environments, and why that's the hard
  part of shipping a WASM library.
- Designing one seam (`configureEngine`) to unlock multiple delivery modes instead
  of forking code.
- That "does it start with SELECT" is not a security boundary — verifying with
  actual attack inputs matters.

---

## 7. Behavioral / project-story answers

**"Tell me about a bug you found."**
The read-only guard. I was documenting it, went to state precisely what it
blocked, and realized `SELECT 1; DROP TABLE t;` would slip through because the
check only looked at the start of the script. I wrote a reproduction (it returned
200 and dropped the table), fixed it to validate every statement, found a *second*
vector (`WITH…DELETE`), tightened the rule, and re-verified with a small suite of
attack inputs. Lesson: a guard isn't real until you've tried to break it.

**"Tell me about a hard technical decision."**
Making it a real installable library. The blocker was WASM loading — the app
relied on a Vite-only feature. I researched sql.js's config, found it accepts a
preloaded `wasmBinary`, and used the bundler's binary loader to embed it, behind
an injectable `configureEngine()`. That one decision turned a single app into a
package with headless, React, and server entry points.

**"How did you ensure quality?"**
Layered verification: a data harness that validates all 50 challenge solutions,
HTTP tests for the server (including the security fixes), and a Playwright suite
that drives the real browser through every feature including persistence across a
reload. I don't claim something works until I've exercised it.

**"What are you most proud of?"**
That one codebase ships four genuinely different products — CLI, headless lib,
React component, backend middleware — cleanly, because I found the right
abstraction instead of copy-pasting.

---

## 8. Fundamentals this project lets you discuss

Interviewers often pivot from the project to fundamentals. Be ready on:

- **SQL:** JOINs (inner/left/right/full), GROUP BY vs WHERE vs HAVING, subqueries,
  CTEs (incl. recursive), window functions (`RANK() OVER (PARTITION BY …)`),
  indexes and `rowid`, transactions, `UPSERT`/`ON CONFLICT`.
- **WebAssembly:** what it is, why near-native, how a module is loaded/instantiated.
- **JS packaging:** ESM vs CJS, `exports` maps, peer vs regular dependencies,
  tree-shaking, bundlers.
- **Browser:** localStorage limits, Blobs/`URL.createObjectURL`, cross-origin
  isolation (COOP/COEP), why MIME types matter.
- **Testing:** unit vs integration vs e2e; why a browser e2e mattered here.

---

## 9. Rapid-fire (know these cold)

| Q | A |
|---|---|
| Language/stack? | TypeScript, React 18, Vite (app), tsup (library), sql.js. |
| Lines of "backend"? | None for the app — it's client-side WASM. The optional server mode is ~250 lines of Node middleware. |
| Bundle size? | App JS ~660 KB (mostly the SQLite WASM); library embeds the same WASM. |
| SQLite version? | 3.49 (whatever sql.js ships). |
| How many challenges? | 50, across 3 datasets, Easy→Hard, auto-graded. |
| How is state stored? | In-memory DB + three localStorage keys (history, solved, saved datasets). |
| Is it published? | Package is publish-ready with `exports` for `.`, `./react`, `./server`, plus a CLI `bin`. |
| Tests? | Playwright e2e (11 checks), HTTP tests for the server, and a solution-validation harness. |
| Biggest limitation? | It's SQLite-dialect and in-memory — not a production datastore or an ORM replacement. |
| Why not just use DB Fiddle / LeetCode? | Those are hosted single-purpose sites; this is installable, offline, all-in-one, and embeddable. |

---

## 10. Questions to ask *them* (shows seniority)

- "Where would a tool like this fit in your onboarding or docs — do teams here
  practice SQL against shared fixtures?"
- "How do you handle dev-time database inspection today?"
- "For an embeddable dev tool, how do you weigh bundle size vs zero-config DX?"

---

*Good luck. If you can explain Sections 2, 4, and 5 in your own words, you can
handle almost anything they throw at this project.*
