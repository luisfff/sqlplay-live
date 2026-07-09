import { useState } from "react";
import type { TableInfo } from "../engine/db";

interface Props {
  schema: TableInfo[];
  onInsert: (snippet: string) => void;
}

export function SchemaTree({ schema, onInsert }: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>({});

  if (schema.length === 0) {
    return (
      <div className="schema-empty">
        No tables yet. Load a sample dataset or run a{" "}
        <code>CREATE TABLE</code>.
      </div>
    );
  }

  return (
    <ul className="schema-tree">
      {schema.map((table) => {
        const isOpen = open[table.name] ?? false;
        return (
          <li key={table.name}>
            <div className="schema-table">
              <button
                className="schema-toggle"
                onClick={() =>
                  setOpen((s) => ({ ...s, [table.name]: !isOpen }))
                }
              >
                {isOpen ? "▾" : "▸"}
              </button>
              <span
                className={`schema-name ${table.kind}`}
                title={`Click to query all rows`}
                onClick={() =>
                  onInsert(`SELECT * FROM ${table.name} LIMIT 100;`)
                }
              >
                {table.name}
              </span>
              <span className="schema-count">{table.rowCount}</span>
            </div>
            {isOpen && (
              <ul className="schema-cols">
                {table.columns.map((col) => (
                  <li
                    key={col.name}
                    onClick={() => onInsert(col.name)}
                    title="Click to insert column name"
                  >
                    <span className="col-name">{col.name}</span>
                    <span className="col-type">
                      {col.type}
                      {col.pk ? " · PK" : ""}
                      {col.notNull && !col.pk ? " · NN" : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
