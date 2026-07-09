# SQLPlay — Deployment & Publishing

Every way to ship SQLPlay, plus what to check before each. See
[ARCHITECTURE.md](ARCHITECTURE.md) for how it's built.

---

## 0. Build outputs (know these first)

| Command | Produces | Used by |
|---|---|---|
| `npm run build` | `dist/` (static web app) | the CLI, static hosting |
| `npm run build:lib` | `dist-lib/` (`index`, `react`, `server` — ESM+CJS+d.ts) | the npm library |
| `npm run build:all` | both of the above | publishing |

`package.json` ships only what's needed via `"files": ["dist", "dist-lib", "bin"]`.

---

## 1. Publish to npm (the headline artifact)

This is what makes `npx sqlplay` and `npm install sqlplay` real for everyone.

### 1.1 One-time prep

```bash
npm login                      # create/login to an npm account
# pick a name that's free, or scope it: @yourname/sqlplay
npm view sqlplay               # if taken, rename in package.json ("name")
```

### 1.2 Guard: always publish a fresh build

Add a `prepublishOnly` script so a publish can never ship stale output:

```jsonc
"scripts": {
  "prepublishOnly": "npm run build:all"
}
```

Optionally verify the exact file list before publishing:

```bash
npm pack --dry-run   # lists every file that would be published
```

You should see `dist/`, `dist-lib/`, `bin/`, `README.md`, `package.json` — and
**not** `src/`, `node_modules/`, tests, or screenshots you don't want shipped.
Trim with `"files"` or a `.npmignore` if needed.

### 1.3 Publish

```bash
npm version patch          # 0.1.0 -> 0.1.1 (or minor/major); tags a commit
npm publish                # runs prepublishOnly -> build:all -> publishes
# scoped + public:
npm publish --access public
```

### 1.4 Verify from a clean project

```bash
mkdir /tmp/try && cd /tmp/try && npm init -y
npm install sqlplay
node -e "const {createDatabase}=require('sqlplay'); createDatabase().then(db=>{db.run('create table t(x); insert into t values(1)'); console.log(db.query('select * from t').rows)})"
npx sqlplay --no-open      # CLI works too
```

### 1.5 Checklist before `npm publish`

- [ ] `npm run build:all` is green
- [ ] `npm run test:e2e` passes (needs `npx playwright install chromium` once)
- [ ] version bumped (`npm version …`)
- [ ] `npm pack --dry-run` file list looks right
- [ ] README renders (screenshots resolve, links work)
- [ ] `LICENSE` present; `repository`/`homepage`/`bugs` fields set in package.json

---

## 2. Deploy the web app (static hosting)

The app is a pure static bundle — host `dist/` anywhere.

```bash
npm run build
# then deploy the dist/ folder
```

- **Vercel / Netlify:** framework preset = Vite; build `npm run build`; output
  `dist`. Nothing else required.
- **GitHub Pages:** push `dist/` (or a CI action). Because `base: "./"`, it works
  from a sub-path (`user.github.io/sqlplay/`) with no config.
- **Any static server / S3 / Cloudflare Pages:** upload `dist/`.

**Headers (recommended):** serve `.wasm` as `application/wasm` (most hosts do
automatically). The app doesn't strictly require COOP/COEP for basic sql.js, but
setting them is harmless and future-proof.

There is **no backend to deploy** for the web app — that's the whole point.

---

## 3. Distribute the CLI

Nothing to deploy — it rides along with the npm package:

```bash
npx sqlplay            # end users run it directly
```

If you want a globally installed binary:

```bash
npm install -g sqlplay && sqlplay
```

---

## 4. Use as a dependency (what consumers do)

```bash
npm install sqlplay
```

- **Headless:** `import { createDatabase } from "sqlplay"` — Node or browser.
- **React:** `import { SqlConsole } from "sqlplay/react"` — needs `react` +
  `react-dom` (peer deps). CSS auto-injected.

No build/deploy step for you beyond publishing; their bundler handles the rest
because the WASM is embedded.

---

## 5. Deploy the backend console (`sqlplay/server`)

```js
import express from "express";
import { sqlplay } from "sqlplay/server";

const app = express();
app.use("/db-console", sqlplay({
  database: process.env.DB_FILE || ":memory:",
  init: "./db",              // schema/seed folder
  readOnly: process.env.NODE_ENV === "production",
}));
app.listen(3000);
```

### Security (do not skip)

A console that runs arbitrary SQL is dangerous. Before deploying anywhere
reachable:

- **Gate the route** behind authentication / an admin check.
- **Never mount it on a public path in production.** Prefer dev-only:
  ```js
  if (process.env.NODE_ENV !== "production") {
    app.use("/db-console", sqlplay({ database: ":memory:", init: "./db" }));
  }
  ```
- Use `readOnly: true` for anything beyond local development.
- Put it behind your reverse proxy's auth (basic auth / SSO) if you truly need it
  in a shared environment.

### Persistence notes

- `:memory:` resets when the process restarts (and does not survive horizontal
  scaling — each instance has its own DB).
- A file database (`database: "./dev.sqlite"`) persists across restarts but is
  **single-process**; it is not a substitute for a real shared database.

---

## 6. Suggested CI (GitHub Actions sketch)

```yaml
name: ci
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run build:all
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
```

Publishing on tag (optional): add a `release` job that runs on `v*` tags,
`npm ci`, then `npm publish` with an `NPM_TOKEN` secret.

---

## 7. Versioning

Follow **semver**:

- **patch** — bug fixes, doc changes.
- **minor** — new backward-compatible features (e.g. a new server option).
- **major** — breaking API changes (renaming an export, changing `createDatabase`
  return shape, changing an `exports` path).

Keep a short `CHANGELOG.md` once you have users.

---

## 8. Rollback

- **npm:** you can `npm deprecate sqlplay@x.y.z "reason"` and publish a fixed
  version. Avoid `npm unpublish` (restricted, and breaks anyone depending on it).
- **Static app:** redeploy the previous `dist/` (or previous commit) — it's
  stateless, so rollback is instant.
