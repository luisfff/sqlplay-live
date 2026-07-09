import { useState } from "react";

interface Props {
  onClose: () => void;
}

type HelpTab = "app" | "library";

export function HelpModal({ onClose }: Props) {
  const [tab, setTab] = useState<HelpTab>("app");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>SQLPlay — Help</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Toggle between the two ways to use SQLPlay */}
        <div className="help-toggle">
          <button
            className={tab === "app" ? "active" : ""}
            onClick={() => setTab("app")}
          >
            Use the console
          </button>
          <button
            className={tab === "library" ? "active" : ""}
            onClick={() => setTab("library")}
          >
            Install &amp; embed
          </button>
        </div>

        <div className="modal-body">
          {tab === "app" ? <AppHelp /> : <LibraryHelp />}

          <p className="help-foot">
            Full manual:{" "}
            <a
              href="https://github.com/"
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.preventDefault()}
              title="See docs/USER_GUIDE.md in the repository"
            >
              docs/USER_GUIDE.md
            </a>{" "}
            in the repository.
          </p>
        </div>
      </div>
    </div>
  );
}

function AppHelp() {
  return (
    <>
      <p className="help-lead">
        A real SQLite database running entirely in your browser. No server, no
        setup, fully offline.
      </p>

      <h3>Two modes</h3>
      <ul>
        <li>
          <strong>Playground</strong> — write and run any SQL against a dataset.
        </li>
        <li>
          <strong>Challenges</strong> — solve graded SQL problems; your answer
          is checked automatically.
        </li>
      </ul>

      <h3>Running queries</h3>
      <ul>
        <li>
          Type SQL, then <strong>▶ Run</strong> or <kbd>Ctrl</kbd>/<kbd>⌘</kbd> +{" "}
          <kbd>Enter</kbd>.
        </li>
        <li>
          <strong>Select</strong> part of the script to run only that part.
        </li>
        <li>Run several statements at once, separated by semicolons.</li>
      </ul>

      <h3>Output tabs (Playground)</h3>
      <ul>
        <li>
          <strong>Results</strong> — query output; export any result to CSV.
        </li>
        <li>
          <strong>ER Diagram</strong> — auto-drawn schema with foreign-key
          links; download as SVG.
        </li>
        <li>
          <strong>Data editor</strong> — edit cells, add rows, delete rows.
        </li>
      </ul>

      <h3>Create &amp; save your own dataset</h3>
      <ol>
        <li>
          Pick <strong>Empty database</strong>.
        </li>
        <li>
          Write <code>CREATE TABLE … FOREIGN KEY …</code> and <code>INSERT</code>{" "}
          statements, then <strong>Run</strong>.
        </li>
        <li>
          Click <strong>💾 Save dataset</strong> and name it — it appears under{" "}
          <em>“My datasets”</em> and persists across sessions.
        </li>
      </ol>

      <h3>Import &amp; export</h3>
      <ul>
        <li>
          <strong>⭱ Import</strong> a <code>.csv</code> or <code>.json</code>{" "}
          file → auto-creates a table.
        </li>
        <li>
          <strong>⭳ .sqlite</strong> downloads the whole database as a real
          SQLite file.
        </li>
        <li>
          <strong>🔗 Share</strong> copies a link that reproduces the dataset +
          query (the query text, not imported data).
        </li>
      </ul>

      <h3>Resetting &amp; what persists</h3>
      <ul>
        <li>
          The working database is <strong>in-memory</strong>: refreshing the
          page, switching datasets, or changing challenge <strong>wipes it</strong>{" "}
          — unless you <strong>Save</strong> it.
        </li>
        <li>
          <strong>Saved datasets</strong>, <strong>query history</strong>, and{" "}
          <strong>solved progress</strong> are kept in your browser between
          sessions.
        </li>
        <li>
          Clear history from the <strong>🕑 History</strong> panel; delete a
          saved dataset with <strong>🗑 Delete</strong>.
        </li>
      </ul>

      <h3>SQL dialect</h3>
      <p>
        SQLPlay runs <strong>SQLite 3.49</strong>. Standard SQL — JOINs,
        subqueries, CTEs, window functions — works. Engine-specific syntax from
        other databases (e.g. <code>SELECT TOP</code>, <code>MERGE</code>) does
        not; use the SQLite equivalent (<code>LIMIT</code>, etc.).
      </p>

      <h3>Keyboard shortcuts</h3>
      <table className="help-keys">
        <tbody>
          <tr>
            <td>
              <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Enter</kbd>
            </td>
            <td>Run query / Check answer</td>
          </tr>
          <tr>
            <td>
              <kbd>Ctrl</kbd> + <kbd>Space</kbd>
            </td>
            <td>Autocomplete table/column names</td>
          </tr>
          <tr>
            <td>
              <kbd>Enter</kbd> (in a Data-editor cell)
            </td>
            <td>Commit the edit</td>
          </tr>
        </tbody>
      </table>
    </>
  );
}

function LibraryHelp() {
  return (
    <>
      <p className="help-lead">
        Run SQLPlay from the command line, or install it as a dependency in your
        own project.
      </p>

      <h3>Run via the CLI</h3>
      <p>No global install needed — launch it with your package manager:</p>
      <pre className="help-code">
{`npx sqlplay        # npm
pnpm dlx sqlplay   # pnpm
bunx sqlplay       # bun`}
      </pre>
      <p>
        Your browser opens to the console. Options:{" "}
        <code>--port &lt;n&gt;</code>, <code>--host &lt;h&gt;</code>,{" "}
        <code>--no-open</code>. Press <kbd>Ctrl</kbd>+<kbd>C</kbd> to stop.
      </p>

      <h3>
        Use as a dependency <span className="badge-ok">Available</span>
      </h3>
      <p>
        <code>npm install sqlplay</code>. The SQLite WASM is embedded, so these
        work in Node and any bundler with no extra setup.
      </p>

      <p className="help-sub">Headless in-memory database:</p>
      <pre className="help-code">
{`import { createDatabase } from "sqlplay";

const db = await createDatabase();
db.run("CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT);");
const rows = db.query("SELECT * FROM t;");   // { columns, rows }
const bytes = db.export();                    // a real .sqlite file`}
      </pre>

      <p className="help-sub">
        Embeddable React console (React is a peer dependency):
      </p>
      <pre className="help-code">
{`import { SqlConsole } from "sqlplay/react";

<SqlConsole height="600px" />   // full console inside your app`}
      </pre>

      <h3>
        Backend-served console, H2-style{" "}
        <span className="badge-ok">Available</span>
      </h3>
      <p>
        Mount it as Express/Connect middleware — the database lives in your Node
        process, and the browser console talks to it over a small API:
      </p>
      <pre className="help-code">
{`import express from "express";
import { sqlplay } from "sqlplay/server";

const app = express();
app.use("/db-console", sqlplay({
  database: ":memory:",   // or "./dev.sqlite" (persists)
  init: "./db",           // build schema+seed from ./db/*.sql on start
}));
app.listen(3000);         // open http://localhost:3000/db-console`}
      </pre>
      <p className="help-note">
        Options: <code>database</code>, <code>init</code> (inline SQL, a{" "}
        <code>.sql</code> file, or a folder of <code>*.sql</code> run in order),{" "}
        <code>resetOnStart</code>, <code>readOnly</code>, <code>maxRows</code>,{" "}
        <code>title</code>. Keep your schema/seed in a folder, restart to
        rebuild. A future adapter will point the console at a production database
        (e.g. Postgres). Serve it on a dev-only / protected route.
      </p>
    </>
  );
}
