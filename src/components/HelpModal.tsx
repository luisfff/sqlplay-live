interface Props {
  onClose: () => void;
}

export function HelpModal({ onClose }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>SQLPlay — Help</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <AppHelp />
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
          Use the SQL editor to create tables and insert your own data.
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

      <h3>Export</h3>
      <ul>
        <li>Export query results with the <strong>⭳ CSV</strong> link.</li>
      </ul>

      <h3>Resetting &amp; what persists</h3>
      <ul>
        <li>
          Startup uses <strong>Tasks database</strong>.
        </li>
        <li>
          <strong>Reset current dataset</strong> restores the selected sample's
          seed or a saved dataset's snapshot, discarding unsaved database changes.
        </li>
        <li>
          <strong>Reset to Tasks database</strong> always switches to a fresh
          Tasks seed and its starter query. Both resets ask for confirmation;
          cancel changes nothing. Neither changes saved datasets, history or progress.
        </li>
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
    </>
  );
}
