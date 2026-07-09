import { useEffect, useState } from "react";
import type { InMemoryDatabase, TableInfo } from "../engine/db";

interface Props {
  db: InMemoryDatabase | null;
  tables: TableInfo[];
  onChanged: () => void;
}

interface Loaded {
  columns: string[]; // data columns (rowid excluded)
  rows: { rowid: number; cells: unknown[] }[];
}

function coerce(value: string, type: string): unknown {
  if (value === "") return null;
  const numeric = /^-?\d+(\.\d+)?$/.test(value.trim());
  if (numeric && /INT|REAL|FLOA|DOUB|NUM|DEC/i.test(type)) return Number(value);
  return value;
}

export function DataEditor({ db, tables, onChanged }: Props) {
  const editable = tables.filter((t) => t.kind === "table");
  const [selected, setSelected] = useState<string>("");
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [draft, setDraft] = useState<string[] | null>(null);
  const [msg, setMsg] = useState<string>("");

  // Keep a valid selection as the schema changes.
  useEffect(() => {
    if (editable.length === 0) {
      setSelected("");
    } else if (!editable.some((t) => t.name === selected)) {
      setSelected(editable[0].name);
    }
  }, [editable, selected]);

  const load = (name: string) => {
    if (!db || !name) return setLoaded(null);
    const res = db.query(`SELECT rowid AS __rowid, * FROM "${name}"`);
    if (!res) return setLoaded({ columns: [], rows: [] });
    setLoaded({
      columns: res.columns.slice(1),
      rows: res.rows.map((r) => ({
        rowid: Number(r[0]),
        cells: r.slice(1),
      })),
    });
    setDraft(null);
  };

  useEffect(() => {
    load(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, db]);

  const info = tables.find((t) => t.name === selected);
  const typeOf = (col: string) =>
    info?.columns.find((c) => c.name === col)?.type ?? "";

  const commitCell = (rowid: number, col: string, raw: string, prev: unknown) => {
    if (!db) return;
    if (raw === (prev == null ? "" : String(prev))) return; // unchanged
    try {
      db.mutate(`UPDATE "${selected}" SET "${col}" = ? WHERE rowid = ?`, [
        coerce(raw, typeOf(col)),
        rowid,
      ]);
      setMsg(`Updated ${selected}.${col}`);
      load(selected);
      onChanged();
    } catch (e) {
      setMsg(`Update failed: ${e instanceof Error ? e.message : e}`);
      load(selected);
    }
  };

  const deleteRow = (rowid: number) => {
    if (!db) return;
    try {
      db.mutate(`DELETE FROM "${selected}" WHERE rowid = ?`, [rowid]);
      setMsg("Row deleted.");
      load(selected);
      onChanged();
    } catch (e) {
      setMsg(`Delete failed: ${e instanceof Error ? e.message : e}`);
    }
  };

  const saveDraft = () => {
    if (!db || !loaded || !draft) return;
    const cols = loaded.columns;
    const used: string[] = [];
    const params: unknown[] = [];
    draft.forEach((v, i) => {
      if (v !== "") {
        used.push(cols[i]);
        params.push(coerce(v, typeOf(cols[i])));
      }
    });
    if (used.length === 0) return setMsg("Enter at least one value.");
    try {
      db.mutate(
        `INSERT INTO "${selected}" (${used
          .map((c) => `"${c}"`)
          .join(", ")}) VALUES (${used.map(() => "?").join(", ")})`,
        params
      );
      setMsg("Row inserted.");
      load(selected);
      onChanged();
    } catch (e) {
      setMsg(`Insert failed: ${e instanceof Error ? e.message : e}`);
    }
  };

  if (editable.length === 0) {
    return (
      <div className="results-empty">
        No editable tables yet. Create a table or load a dataset.
      </div>
    );
  }

  return (
    <div className="data-editor">
      <div className="data-toolbar">
        <label>
          Table&nbsp;
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            {editable.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name} ({t.rowCount})
              </option>
            ))}
          </select>
        </label>
        <button
          className="btn"
          onClick={() =>
            setDraft(loaded ? loaded.columns.map(() => "") : null)
          }
        >
          ＋ Add row
        </button>
        <span className="data-msg">{msg}</span>
      </div>

      <div className="table-scroll">
        <table className="editable">
          <thead>
            <tr>
              {loaded?.columns.map((c) => (
                <th key={c}>
                  {c}
                  <span className="col-type"> {typeOf(c)}</span>
                </th>
              ))}
              <th className="act-col"></th>
            </tr>
          </thead>
          <tbody>
            {draft && (
              <tr className="draft-row">
                {loaded?.columns.map((c, i) => (
                  <td key={c}>
                    <input
                      value={draft[i]}
                      placeholder="NULL"
                      onChange={(e) => {
                        const next = [...draft];
                        next[i] = e.target.value;
                        setDraft(next);
                      }}
                    />
                  </td>
                ))}
                <td className="act-col">
                  <button className="link-btn" onClick={saveDraft}>
                    Save
                  </button>
                  <button className="link-btn" onClick={() => setDraft(null)}>
                    ✕
                  </button>
                </td>
              </tr>
            )}
            {loaded?.rows.map((row) => (
              <tr key={row.rowid}>
                {row.cells.map((cell, ci) => {
                  const col = loaded.columns[ci];
                  return (
                    <td key={ci}>
                      <input
                        defaultValue={cell == null ? "" : String(cell)}
                        placeholder="NULL"
                        key={`${row.rowid}-${col}-${String(cell)}`}
                        onBlur={(e) =>
                          commitCell(row.rowid, col, e.target.value, cell)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter")
                            (e.target as HTMLInputElement).blur();
                        }}
                      />
                    </td>
                  );
                })}
                <td className="act-col">
                  <button
                    className="link-btn danger"
                    onClick={() => deleteRow(row.rowid)}
                    title="Delete row"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
