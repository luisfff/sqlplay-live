# SQLPlay — Security & Bug Audit

Adversarial audit performed as if the project were going to production. Every
finding below was **reproduced by executing code**, not by inspection alone. The
commands used are shown so each result can be re-run.

Scope reality check: SQLPlay's hosted app is **client-side and single-user** —
no auth, no roles, no sessions, no server database, no network API. So whole
classes from a generic pentest matrix are **not applicable**: authentication
bypass, authorization / broken access control, IDOR, CSRF, JWT/session
handling, privilege escalation, server-side rate limiting. They're listed as
N/A in the summary rather than faked. The real attack surface is: the SQL/data
parsers, the share-link decoder, result rendering (XSS), and the **optional**
`sqlplay/server` Express middleware (the only component with an HTTP boundary).

Severity uses: **High** (integrity/RCE-ish within the app's trust boundary),
**Medium**, **Low** (defense-in-depth / needs unusual preconditions).

---

## Summary

| # | Title | Severity | Status |
|---|-------|----------|--------|
| 1 | Second-order SQL injection via CSV import (type-inference short-circuit) | **High** | ✅ Fixed & verified |
| 2 | `readOnly` server guard bypassable by mutating `PRAGMA`s | Medium | ✅ Fixed & verified |
| 3 | Synchronous unbounded query blocks the Node event loop (server DoS) | Medium | ⚠️ Documented (fix proposed) |
| 4 | CSV export does not neutralize spreadsheet formula injection | Low | ⚠️ Documented (see note) |
| 5 | Server console `esc()` didn't escape quotes (attribute-injection latent) | Low | ✅ Hardened |
| 6 | DataEditor crash on dataset switch (blank page) | High (UX) | ✅ Fixed earlier + regression test |

**Verified NON-issues (tested, held up):**
- **Client XSS** — the React app renders all result cells / column names / SQL as
  escaped React children; there is **no** `dangerouslySetInnerHTML`/`innerHTML`
  anywhere in `src` except the server console page. Injecting
  `<img src=x onerror=alert(1)>` as a cell value renders as inert text.
- **JSON import** — types a mixed column as `TEXT` and quotes values; the same
  payload that broke CSV import is safely quoted here.
- **Share-link decode** — malformed / non-JSON / bad-base64 `#s=` payloads are
  caught and return `null`; the decoder type-checks `datasetId`/`query`.
- **`splitStatements`** — semicolons inside quotes/comments do not create a false
  split, so the multi-statement read-only guard can't be fooled that way.

---

## 1. Second-order SQL injection via CSV import — **High** — FIXED

**Files:** `src/lib/csv.ts` (`inferType`, `csvToSql` → `lit`)

**Root cause.** `inferType` returned `REAL` on the **first** decimal value it saw
*without validating the remaining values*, and `lit()` emitted numeric-typed
values **unquoted**. So a column whose first value is a decimal and a later value
is arbitrary text produced an `INSERT` with that text concatenated as raw SQL.

**Reproduction (executed).**
```js
import { csvToSql } from "./src/lib/csv.ts";
import { createDatabase } from "./dist-lib/index.js";
const db = await createDatabase();
db.run("CREATE TABLE students(id INTEGER, name TEXT); INSERT INTO students VALUES (1,'ada');");
db.run(csvToSql("upload.csv", "id\n1.5\n0); DROP TABLE students;--"));
```
Generated SQL (before fix):
```sql
INSERT INTO "evil" ("id") VALUES
(1.5),
(0); DROP TABLE students;--);
```
`db.run()` splits on the injected `;`, so `DROP TABLE students` **executed**.
Observed: `students table dropped by imported CSV: true`.

**Expected:** importing a data file only creates/populates a table; it must never
execute control statements from cell data.

**Impact.** Importing an attacker-crafted CSV runs arbitrary SQL in the victim's
in-memory database (drop their tables, `ATTACH`, create tables, etc.). Blast
radius is the current browser session (no server DB), but it is a genuine
injection and also a plain **correctness bug** — any "mostly numeric with a
stray text value" column silently corrupted or failed the import.

**Fix.** (a) `inferType` now scans **all** values and falls back to `TEXT` if any
non-empty value is non-numeric; (b) `lit()` emits a bare literal **only** when the
value matches a strict numeric regex, otherwise it quotes and escapes it — so a
mis-typed column can never inject. `jsonToSql` got the same `Number.isFinite`
guard for defense-in-depth.

**Verified after fix.** Same payload now yields `('0); DROP TABLE students;--')`
(quoted), `students` survives, and clean numeric CSVs still type
`INTEGER`/`REAL`/`TEXT` with bare numeric literals (no regression).

---

## 2. `readOnly` server guard bypassable by mutating PRAGMAs — **Medium** — FIXED

**Files:** `src/server/index.ts` (`isReadOnlyStatement`)

**Root cause.** The guard classified **any** statement starting with `pragma` (or
`explain`) as read-only. But several PRAGMAs mutate: `PRAGMA user_version = N`
writes the DB header, `PRAGMA optimize` / `wal_checkpoint` write, etc.

**Reproduction (executed).** Mounted the middleware with `readOnly: true`:
```
BLOCKED(403)  INSERT / DELETE / DROP / WITH..DELETE   (controls — correct)
ALLOWED(200)  PRAGMA user_version = 7                 (bypass)
ALLOWED(200)  PRAGMA optimize                         (bypass)
→ PRAGMA user_version after the "read-only" write = 7   (mutation confirmed)
```

**Impact.** A "read-only" console accepts state-changing statements. Low data
value on `:memory:`, higher against a file-backed `database:` (the served DB is
altered in-process). The README already disclaims the guard is "pragmatic, not a
hardened parser" — this tightens it toward that promise.

**Fix.** A PRAGMA is now read-only **only** if it has no `=` assignment and isn't
in a small denylist of mutating function-pragmas (`optimize`, `wal_checkpoint`,
`incremental_vacuum`, `shrink_memory`, `writable_schema`, `secure_delete`,
`journal_mode`, `auto_vacuum`, `user_version`, `application_id`,
`schema_version`). Verified: the two bypasses now return **403**; legitimate reads
(`PRAGMA table_info(t)`, `SELECT`) still return **200**.

---

## 3. Synchronous unbounded query blocks the event loop (server DoS) — **Medium** — DOCUMENTED

**Files:** `src/server/index.ts` (`/api/query`), `src/engine/db.ts` (`run`)

**Root cause.** `sql.js`'s `db.exec()` is **synchronous** and there is no
statement timeout or row cap *during* execution (`maxRows` is applied only to the
result *after* it returns). A read-only statement the guard happily allows —
`WITH RECURSIVE r(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM r) SELECT n FROM r` —
never terminates.

**Reproduction (executed).** Fired that query at the middleware with a 2-second
in-process watchdog and a 5-second external `timeout`:
```
firing unbounded recursive CTE (readOnly=true)...
exit_code=124   # external timeout had to kill it; the 2s watchdog never fired
```
The watchdog never fired because the synchronous exec **blocked the event loop** —
proving one request hangs the entire Node process (all other clients included).

**Impact.** In server-middleware mode this is a single-request denial of service,
reachable even in `readOnly` mode. In the browser the same query freezes the tab
(single-user, self-inflicted — lower concern).

**Recommended fix (not auto-applied — non-trivial).** Run `sql.js` in a **worker
thread** (Node `worker_threads` / a Web Worker in the browser) with a hard
wall-clock timeout that terminates the worker, or wire SQLite's
`progress_handler` to abort after N opcodes. Also cap request body size. Until
then, the existing README guidance stands: **mount behind auth**.

---

## 4. CSV export — spreadsheet formula injection — **Low** — DOCUMENTED

**Files:** `src/lib/csv.ts` (`csvCell` / `resultToCsv`)

**Root cause.** `csvCell` quotes only for `",\n\r`; it does not neutralize cells
that begin with `=`, `+`, `-`, `@` (or tab/CR). Opening the exported `.csv` in
Excel/Sheets can execute such a cell as a formula.

**Reproduction (executed).** `resultToCsv({columns:["name"], rows:[["=1+1+cmd|'/c calc'!A1"]]})`
→ the data cell is written verbatim starting with `=`.

**Impact.** Low: the exported data originates from the user's own DB / imported
files, and exploitation requires the victim to open the file in a spreadsheet with
macros/DDE enabled.

**Why not auto-fixed.** The standard mitigation (prefix `'`/tab) **corrupts
legitimate data** — e.g. negative numbers like `-5` or `+` values — which for a
SQL result-export tool is a real usability regression. This is a deliberate
tradeoff to flag for a human decision rather than silently mangle exports.
Recommended approach if adopted: prefix only when a cell is non-numeric **and**
starts with a formula trigger, and document the behavior.

---

## 5. Server console `esc()` didn't escape quotes — **Low** — HARDENED

**Files:** `src/server/page.ts`

**Root cause.** The inline `esc()` escaped `& < >` but not `"`/`'`, while it is
used inside an HTML attribute: `data-n="'+esc(name)+'"`. A table name containing a
double-quote could break out of the attribute. Requires write access to create
such an identifier (so not reachable in `readOnly`), hence Low.

**Fix.** `esc()` now also escapes `"`→`&quot;` and `'`→`&#39;`, closing the
attribute-injection path as defense-in-depth. (`title` was already escaped for
text context via `escapeHtml`.)

---

## 6. DataEditor crash on dataset switch — **High (UX)** — FIXED + REGRESSION TEST

**Files:** `src/components/DataEditor.tsx`, `src/App.tsx`, `src/main.tsx`

**Root cause.** Switching datasets creates a **new** `InMemoryDatabase`
(`App.tsx`), so `DataEditor`'s load effect re-ran against the new `db` while
`selected` still named the previous dataset's table. `db.query()` threw
`no such table …` and — because `load()` had no try/catch and there was **no
error boundary** — the throw unmounted the whole React tree to a blank page.

**Fix (from the prior session, retained).** Wrapped `load()` in try/catch;
added a top-level `ErrorBoundary`; added an e2e regression test
("Dataset switch on Data editor tab does not crash"). Proven: reverting the
`load()` fix makes the regression test fail (`appAlive=false`), and the boundary
catches the throw into a recoverable fallback instead of a blank page.

---

## How to re-run these checks

```bash
npm run build:all           # produces dist/ and dist-lib/ used by the probes
# CSV injection + export:  bundle src/lib/csv.ts with esbuild, feed payloads
# server guard + DoS:      mount dist-lib/server.js on an http server, POST /api/query
npm run test:e2e            # 12/12 browser checks incl. the crash regression test
npm run typecheck           # clean
```
All probe scripts in this audit were throwaway (`_*.mjs`) and removed after use;
the permanent guardrails are the e2e regression test plus these fixes. See
[IMPROVEMENTS.md](IMPROVEMENTS.md) for the recommendation to add a `vitest` unit
suite that pins findings #1–#5 permanently.
