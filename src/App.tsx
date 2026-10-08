import { useCallback, useEffect, useRef, useState } from "react";
import {
  InMemoryDatabase,
  lastResultSet,
  type ForeignKey,
  type StatementOutcome,
  type TableInfo,
} from "./engine/db";
import { SAMPLE_DATASETS, findDataset } from "./data/samples";
import { CHALLENGES, type Challenge } from "./data/challenges";
import { SqlEditor } from "./components/SqlEditor";
import { ResultsTable } from "./components/ResultsTable";
import { SchemaTree } from "./components/SchemaTree";
import { ChallengeList, ChallengeBar } from "./components/Challenge";
import { ERDiagram } from "./components/ERDiagram";
import { DataEditor } from "./components/DataEditor";
import { HelpModal } from "./components/HelpModal";
import { compareResults, type CompareResult } from "./lib/compare";
import { csvToSql, jsonToSql } from "./lib/csv";
import { encodeShareUrl, decodeShareUrl } from "./lib/share";
import {
  loadHistory,
  pushHistory,
  clearHistory,
  loadSolved,
  markSolved,
  type HistoryEntry,
} from "./lib/history";
import {
  listUserDatasets,
  saveUserDataset,
  deleteUserDataset,
  getUserDataset,
  base64ToBytes,
  type UserDataset,
} from "./lib/userDatasets";

type Mode = "play" | "learn";
type OutputView = "results" | "diagram" | "data";

const DEFAULT_DATASET_ID = "tasks";

async function freshDatasetDb(datasetId: string): Promise<InMemoryDatabase> {
  const db = await InMemoryDatabase.create();
  const ds = findDataset(datasetId);
  if (ds.sql.trim()) db.run(ds.sql);
  return db;
}

export default function App() {
  const [mode, setMode] = useState<Mode>("play");
  const [outputView, setOutputView] = useState<OutputView>("results");
  const [db, setDb] = useState<InMemoryDatabase | null>(null);
  const [schema, setSchema] = useState<TableInfo[]>([]);
  const [foreignKeys, setForeignKeys] = useState<ForeignKey[]>([]);
  const [query, setQuery] = useState<string>("");
  const [outcomes, setOutcomes] = useState<StatementOutcome[]>([]);
  const [datasetId, setDatasetId] = useState<string>(DEFAULT_DATASET_ID);
  const [status, setStatus] = useState<string>("Loading SQLite engine…");

  const [userDatasets, setUserDatasets] = useState<UserDataset[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [solved, setSolved] = useState<Record<string, boolean>>({});
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);
  const [feedback, setFeedback] = useState<CompareResult | null>(null);

  const queryRef = useRef<string>("");
  queryRef.current = query;
  const selectionRef = useRef<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshSchema = useCallback((d: InMemoryDatabase) => {
    setSchema(d.schema());
    setForeignKeys(d.foreignKeys());
  }, []);

  const loadDataset = useCallback(
    async (id: string, nextQuery?: string) => {
      const dataset = findDataset(id);
      const fresh = await InMemoryDatabase.create();
      if (dataset.sql.trim()) fresh.run(dataset.sql);
      setDb(fresh);
      refreshSchema(fresh);
      setQuery(nextQuery ?? dataset.starterQuery);
      setOutcomes([]);
      setDatasetId(id);
      setStatus(`Loaded "${dataset.name}" — in-memory SQLite ready.`);
    },
    [refreshSchema]
  );

  // Open either a built-in sample or a saved user dataset (prefixed "user:").
  const openDataset = useCallback(
    async (value: string, nextQuery?: string) => {
      if (value.startsWith("user:")) {
        const ud = getUserDataset(value.slice(5));
        if (!ud) return loadDataset(DEFAULT_DATASET_ID);
        const database = await InMemoryDatabase.open(base64ToBytes(ud.b64));
        setDb(database);
        refreshSchema(database);
        setQuery(nextQuery ?? `-- Saved dataset: ${ud.name}\n`);
        setOutcomes([]);
        setDatasetId(value);
        setStatus(`Loaded saved dataset "${ud.name}".`);
      } else {
        await loadDataset(value, nextQuery);
      }
    },
    [loadDataset, refreshSchema]
  );

  const currentUserDataset = datasetId.startsWith("user:")
    ? userDatasets.find((d) => d.id === datasetId.slice(5))
    : undefined;

  const saveDataset = useCallback(() => {
    if (!db) return;
    const name = window.prompt(
      "Save current database as a dataset:",
      currentUserDataset?.name ?? ""
    );
    if (!name || !name.trim()) return;
    try {
      const { list, saved } = saveUserDataset(name.trim(), db.export(), Date.now());
      setUserDatasets(list);
      setDatasetId(`user:${saved.id}`);
      setStatus(`Saved dataset "${saved.name}".`);
    } catch {
      setStatus("Save failed: browser storage is full. Try a smaller dataset.");
    }
  }, [db, currentUserDataset]);

  const deleteDataset = useCallback(() => {
    if (!currentUserDataset) return;
    if (!window.confirm(`Delete saved dataset "${currentUserDataset.name}"?`))
      return;
    setUserDatasets(deleteUserDataset(currentUserDataset.id));
    loadDataset(DEFAULT_DATASET_ID);
  }, [currentUserDataset, loadDataset]);

  // Rebuild the current dataset from scratch, discarding any changes made to it.
  const resetDatabase = useCallback(async () => {
    if (
      !window.confirm(
        "Reset the database to its original state? All changes will be lost."
      )
    )
      return;
    setFeedback(null);
    await openDataset(datasetId, queryRef.current);
    setStatus("Database reset to its original state.");
  }, [datasetId, openDataset]);

  // Boot: honor a shared link if present, else the default dataset.
  useEffect(() => {
    setHistory(loadHistory());
    setSolved(loadSolved());
    setUserDatasets(listUserDatasets());
    const shared = decodeShareUrl();
    if (shared) {
      loadDataset(shared.datasetId, shared.query).then(() =>
        setStatus("Loaded shared query from link.")
      );
    } else {
      loadDataset(DEFAULT_DATASET_ID).catch((err) =>
        setStatus(`Failed to start engine: ${String(err)}`)
      );
    }
  }, [loadDataset]);

  const run = useCallback(() => {
    if (!db) return;
    const sql = selectionRef.current.trim() || queryRef.current;
    const result = db.run(sql);
    setOutcomes(result);
    refreshSchema(db);
    setHistory(pushHistory({ sql, datasetId, at: Date.now() }));
    const errored = result.find((r) => r.error);
    setStatus(
      errored
        ? `Error: ${errored.error}`
        : `Executed ${result.length} statement${
            result.length === 1 ? "" : "s"
          }${selectionRef.current.trim() ? " (selection)" : ""}.`
    );
  }, [db, datasetId, refreshSchema]);

  const insertSnippet = useCallback((snippet: string) => {
    setQuery((q) => (q.trimEnd() ? q + "\n" + snippet : snippet));
  }, []);

  const downloadDb = useCallback(() => {
    if (!db) return;
    const bytes = db.export();
    const blob = new Blob([bytes as unknown as BlobPart], {
      type: "application/octet-stream",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${datasetId || "database"}.sqlite`;
    a.click();
    URL.revokeObjectURL(url);
  }, [db, datasetId]);

  const share = useCallback(async () => {
    const url = encodeShareUrl({ datasetId, query: queryRef.current });
    try {
      await navigator.clipboard.writeText(url);
      setStatus("Shareable link copied to clipboard.");
    } catch {
      setStatus(url);
    }
  }, [datasetId]);

  const onImportFile = useCallback(
    async (file: File) => {
      if (!db) return;
      try {
        const text = await file.text();
        const sql = file.name.toLowerCase().endsWith(".json")
          ? jsonToSql(file.name, text)
          : csvToSql(file.name, text);
        const result = db.run(sql);
        const err = result.find((r) => r.error);
        refreshSchema(db);
        setStatus(
          err ? `Import failed: ${err.error}` : `Imported "${file.name}".`
        );
      } catch (e) {
        setStatus(`Import failed: ${e instanceof Error ? e.message : e}`);
      }
    },
    [db, refreshSchema]
  );

  const selectChallenge = useCallback(
    async (c: Challenge) => {
      setActiveChallenge(c);
      setFeedback(null);
      await loadDataset(
        c.datasetId,
        `-- ${c.title}\n-- Write your query below, then click "Check answer".\n\n`
      );
    },
    [loadDataset]
  );

  const checkChallenge = useCallback(async () => {
    if (!activeChallenge) return;
    const userDb = await freshDatasetDb(activeChallenge.datasetId);
    const userOutcomes = userDb.run(queryRef.current);
    setOutcomes(userOutcomes);

    const errored = userOutcomes.find((r) => r.error);
    if (errored) {
      setFeedback({ pass: false, reason: `SQL error: ${errored.error}` });
      return;
    }

    const expDb = await freshDatasetDb(activeChallenge.datasetId);
    const expected = lastResultSet(expDb.run(activeChallenge.solution));
    const actual = lastResultSet(userOutcomes);
    const cmp = compareResults(expected, actual, activeChallenge.orderMatters);
    setFeedback(cmp);
    if (cmp.pass) {
      setSolved(markSolved(activeChallenge.id));
      setStatus(`Solved "${activeChallenge.title}"! 🎉`);
    }
  }, [activeChallenge]);

  const showSolution = useCallback(() => {
    if (!activeChallenge) return;
    setQuery(
      `-- Reference solution for: ${activeChallenge.title}\n${activeChallenge.solution}`
    );
  }, [activeChallenge]);

  const switchMode = useCallback(
    (m: Mode) => {
      setMode(m);
      setFeedback(null);
      if (m === "learn" && !activeChallenge) {
        selectChallenge(CHALLENGES[0]);
      } else if (m === "play") {
        setActiveChallenge(null);
      }
    },
    [activeChallenge, selectChallenge]
  );

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">▊</span> SQLPlay
          <span className="tagline">in-memory SQL console</span>
        </div>

        <div className="mode-switch">
          <button
            className={mode === "play" ? "active" : ""}
            onClick={() => switchMode("play")}
          >
            Playground
          </button>
          <button
            className={mode === "learn" ? "active" : ""}
            onClick={() => switchMode("learn")}
          >
            Challenges
          </button>
        </div>

        <div className="controls">
          {mode === "play" && (
            <label>
              Dataset&nbsp;
              <select
                value={datasetId}
                onChange={(e) => openDataset(e.target.value)}
              >
                <optgroup label="Samples">
                  {SAMPLE_DATASETS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </optgroup>
                {userDatasets.length > 0 && (
                  <optgroup label="My datasets">
                    {userDatasets.map((d) => (
                      <option key={d.id} value={`user:${d.id}`}>
                        {d.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </label>
          )}
          <button className="btn primary" onClick={run} disabled={!db}>
            ▶ Run <span className="hint">Ctrl/⌘+↵</span>
          </button>
          {mode === "play" && (
            <button className="btn" onClick={saveDataset} disabled={!db}>
              💾 Save dataset
            </button>
          )}
          {mode === "play" && currentUserDataset && (
            <button className="btn" onClick={deleteDataset}>
              🗑 Delete
            </button>
          )}
          <button
            className="btn"
            onClick={resetDatabase}
            disabled={!db}
            title="Reset the database back to its original dataset state"
          >
            ↺ Reset DB
          </button>
          <button className="btn" onClick={() => setShowHistory((s) => !s)}>
            🕑 History
          </button>
          <button
            className="btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={!db}
          >
            ⭱ Import
          </button>
          <button className="btn" onClick={share} disabled={!db}>
            🔗 Share
          </button>
          <button className="btn" onClick={downloadDb} disabled={!db}>
            ⭳ .sqlite
          </button>
          <button
            className="btn"
            onClick={() => setShowHelp(true)}
            title="Help & documentation"
          >
            ❓ Help
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImportFile(f);
              e.target.value = "";
            }}
          />
        </div>
      </header>

      {showHistory && (
        <div className="history-panel">
          <div className="history-head">
            <span>Recent queries</span>
            <button
              className="link-btn"
              onClick={() => {
                clearHistory();
                setHistory([]);
              }}
            >
              Clear
            </button>
          </div>
          {history.length === 0 ? (
            <div className="history-empty">No history yet.</div>
          ) : (
            <ul>
              {history.map((h, i) => (
                <li
                  key={i}
                  onClick={() => {
                    setQuery(h.sql);
                    setShowHistory(false);
                  }}
                  title="Click to load into editor"
                >
                  {h.sql.replace(/\s+/g, " ").slice(0, 90)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="workspace">
        <aside className="sidebar">
          {mode === "play" ? (
            <>
              <div className="sidebar-title">Schema</div>
              <SchemaTree schema={schema} onInsert={insertSnippet} />
            </>
          ) : (
            <>
              <div className="sidebar-title">Challenges</div>
              <ChallengeList
                challenges={CHALLENGES}
                activeId={activeChallenge?.id ?? null}
                solved={solved}
                onSelect={selectChallenge}
              />
            </>
          )}
        </aside>

        <main className="main">
          {mode === "learn" && activeChallenge && (
            <ChallengeBar
              challenge={activeChallenge}
              feedback={feedback}
              onCheck={checkChallenge}
              onShowSolution={showSolution}
            />
          )}
          <SqlEditor
            value={query}
            onChange={setQuery}
            schema={schema}
            onRun={mode === "learn" ? checkChallenge : run}
            onSelectionChange={(s) => (selectionRef.current = s)}
          />
          <div className="divider" />
          {mode === "play" && (
            <div className="output-tabs">
              {(["results", "diagram", "data"] as OutputView[]).map((v) => (
                <button
                  key={v}
                  className={outputView === v ? "active" : ""}
                  onClick={() => setOutputView(v)}
                >
                  {v === "results"
                    ? "Results"
                    : v === "diagram"
                    ? "ER Diagram"
                    : "Data editor"}
                </button>
              ))}
            </div>
          )}
          <div className="output">
            {mode === "learn" || outputView === "results" ? (
              <ResultsTable outcomes={outcomes} />
            ) : outputView === "diagram" ? (
              <ERDiagram schema={schema} foreignKeys={foreignKeys} />
            ) : (
              <DataEditor
                db={db}
                tables={schema}
                onChanged={() => db && refreshSchema(db)}
              />
            )}
          </div>
        </main>
      </div>

      <footer className="statusbar">
        <span className="status-text" title={status}>
          {status}
        </span>
        <span className="footer-credit">
          Built by <strong>Yogesh Chauhan</strong>
          <span className="sep">·</span>
          <a
            href="https://www.linkedin.com/in/yogeshchauhan-dev/"
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </a>
          <span className="sep">·</span>
          <a
            href="https://github.com/Yogesh0627"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </span>
      </footer>

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}
