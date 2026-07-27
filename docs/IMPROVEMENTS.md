# SQLPlay — Improvement & Architecture Review

A staff-engineer read of the codebase after the security audit
([BUGREPORT.md](BUGREPORT.md)). Ordered by effort. Nothing here is required for
the app to work today — it works and is e2e-green — these are the things a senior
reviewer would raise in a production readiness review.

## What's genuinely good (worth saying in an interview)

- **One seam, four products.** `configureEngine()` injects the WASM loader, so a
  single engine + UI ships as CLI, headless lib, React component, and Express
  middleware. This is the standout design decision and it's clean.
- **XSS-safe client by construction.** The React app has zero `innerHTML` /
  `dangerouslySetInnerHTML`; all untrusted data (query results, identifiers, SQL)
  renders as escaped children. Security by default, not by remembering to escape.
- **Correct-by-design pieces:** the quote/comment-aware `splitStatements`, the
  `rowid`-keyed editable grid (works without a declared PK), fresh-DB challenge
  grading (a mutating answer can't skew the comparison), and type-checked
  share-link decoding.
- **Honest disclaimers.** The read-only guard is documented as "pragmatic, not a
  parser — mount behind auth," which is exactly right.

---

## Quick wins (hours)

1. **Add a `vitest` unit suite.** The project's highest-leverage gap. The pure
   logic — `csv.ts`, `share.ts`, `compare.ts`, `splitStatements`, and the server
   `isReadOnlyStatement` guard — is perfectly unit-testable, runs in milliseconds,
   and would have caught the CSV-import injection (#1) immediately. Pin findings
   #1–#5 as regression tests. *This is the #1 recommendation.*
2. **Deduplicate the two HTML escapers** in `src/server/page.ts` (`escapeHtml`
   and the inline `esc`) into one, now that both escape quotes.
3. **Cap the server request body size** in `/api/query` (`readBody`) — currently
   an unbounded string is accumulated from the request stream.
4. **Lazy/async-load the WASM in the app** so first paint isn't blocked by the
   ~660 KB module; show a skeleton while the engine boots.

## Medium improvements (days)

5. **Build imports with bound parameters, not string concatenation.** Even after
   the #1 fix, `csvToSql`/`jsonToSql` assemble SQL by concatenation. Structurally,
   generating `INSERT … VALUES (?, ?, …)` and binding via the engine's existing
   `mutate(sql, params)` removes the entire class of quoting bugs. Refactor
   `App.onImportFile` to build+bind instead of emitting a SQL string.
6. **Decompose `App.tsx` (~510 lines).** It's a god-component holding all state
   (db, schema, FKs, query, datasets, history, challenges, feedback, modals) and
   every handler. Extract hooks: `useDatabase`, `useDatasets`, `useChallenges`,
   `useHistory`. This both improves maintainability and removes the effect-timing
   fragility that caused the DataEditor crash (#6).
7. **Harden the server guard toward a real check.** The keyword/regex guard is
   fine for a dev tool but brittle; a lightweight SQL tokenizer (or an
   allowlist of statement kinds) would be sturdier than regex denylists.

## Long-term / architecture (weeks)

8. **Move `sql.js` off the main thread.** It runs synchronously, so a heavy query
   freezes the browser tab and — critically — **blocks the Node event loop in
   server mode** (DoS, finding #3). Run it in a Web Worker (browser) /
   `worker_threads` (server) with a wall-clock timeout that can terminate a
   runaway query. This is the single most impactful architectural change.
9. **Pluggable backend adapters** (already on the roadmap): let `sqlplay/server`
   point at real Postgres (PGlite/pg) or Turso by swapping the connection, keeping
   dialect parity dev↔prod.
10. **Code-split** the app so the WASM and heavy views (ER diagram, CodeMirror)
    load on demand.

---

## Security posture summary

| Area | Verdict |
|------|---------|
| Client XSS | ✅ Safe by construction (React escaping, no `innerHTML`) |
| SQL injection via import | ✅ Fixed (was High in CSV path) |
| Share-link tampering | ✅ Guarded (type-checked, try/caught) |
| Server `readOnly` guard | ✅ Tightened (PRAGMA bypass closed); ⚠️ still regex-based |
| Server DoS (runaway query) | ⚠️ Open — needs worker + timeout |
| CSV export formula injection | ⚠️ Documented — data-integrity tradeoff |
| Auth / authz / CSRF / JWT / IDOR | N/A — no server auth surface in the app |
| Secrets / env leakage | N/A — no secrets, no `.env`, no external services |

## Testing posture summary

| Layer | Today | Recommended |
|-------|-------|-------------|
| E2E (browser) | ✅ 12 Playwright checks incl. crash regression | keep |
| Server HTTP | ✅ ad-hoc probes during audit | promote to a committed test |
| Unit | ❌ none | **add vitest** (quick win #1) |
| Solution validation | ✅ 50-challenge harness | keep |
